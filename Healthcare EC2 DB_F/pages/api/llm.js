import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_PROFILE ? undefined : {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  profile: process.env.AWS_PROFILE
});

// Model families
const MODEL_FAMILIES = {
  NOVA: 'nova',
  CLAUDE: 'claude',
  MISTRAL: 'mistral'
};

export async function invokeLLM(prompt, model = 'nova-lite', includeMetadataInPresponse = true) {
  let modelId;
  let modelFamily;

  // Determine model ID and family
  switch (model) {
    // Claude models
    case 'claude-sonnet3.5':
      modelId = 'apac.anthropic.claude-3-5-sonnet-20240620-v1:0';
      modelFamily = MODEL_FAMILIES.CLAUDE;
      break;
    case 'claude-sonnet3.5v2':
      modelId = 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0';
      modelFamily = MODEL_FAMILIES.CLAUDE;
      break;
    case 'claude-haiku3':
      modelId = 'apac.anthropic.claude-3-haiku-20240307-v1:0';
      modelFamily = MODEL_FAMILIES.CLAUDE;
      break;
    
    // Mistral models
    case 'mistral-large':
      modelId = 'mistral.mistral-large-2402-v1:0';
      modelFamily = MODEL_FAMILIES.MISTRAL;
      break;
    case 'mistral-8x7b':
      modelId = 'mistral.mixtral-8x7b-instruct-v0:1';
      modelFamily = MODEL_FAMILIES.MISTRAL;
      break;
    case 'mistral-7b':
      modelId = 'mistral.mistral-7b-instruct-v0:2';
      modelFamily = MODEL_FAMILIES.MISTRAL;
      break;

    // Nova models
    case 'nova-pro':
      modelId = 'apac.amazon.nova-pro-v1:0';
      modelFamily = MODEL_FAMILIES.NOVA;
      break;
    case 'nova-lite':
    default:
      modelId = 'apac.amazon.nova-lite-v1:0';
      modelFamily = MODEL_FAMILIES.NOVA;
      break;
  }
  
  console.log(`Invoking model: ${modelId} (${modelFamily})`);

  // Create request body based on model family
  const requestBody = createRequestBody(prompt, modelFamily);
  
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  });

  try {
    const start = Date.now();
    const response = await client.send(command);
    const body = JSON.parse(Buffer.from(response.body).toString("utf-8"));
    const duration = Date.now() - start;
    console.log(`******LLM response********`);
    console.log(body);
    console.log(`******End of response********`);
    const usage = body.usage || {};
    const tokens = {
      input: usage.inputTokens ?? usage.input_tokens ?? 0,
      output: usage.outputTokens ?? usage.output_tokens ?? 0,
      total: usage.totalTokens ?? (usage.inputTokens ?? usage.input_tokens ?? 0) + (usage.outputTokens ?? usage.output_tokens ?? 0),
    };

    const metaNote = [
      `> _Generated using **${model}**_`,
      `> _Tokens used: ${tokens.input} in / ${tokens.output} out_`,
      `> _Time taken: **${duration} ms**_`,
      '',
    ].join('\n');
    // Parse response based on model family
    var summary = parseModelResponse(body, modelFamily);
    summary = includeMetadataInPresponse ? `${metaNote}\n${summary}` : summary    
    return  summary;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to get LLM response");
  }
}

/**
 * Creates the appropriate request body based on model family
 */
function createRequestBody(prompt, modelFamily) {
  switch (modelFamily) {
    case MODEL_FAMILIES.MISTRAL:
      return {
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.0
      };
    
    case MODEL_FAMILIES.CLAUDE:
      return {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      };
    
    case MODEL_FAMILIES.NOVA:
    default:
      return {
        inferenceConfig: {
          max_new_tokens: 2000
        },
        messages: [
          {
            role: "user",
            content: [
              {
                text: prompt
              }
            ]
          }
        ]
      };
  }
}

/**
 * Parses the model response based on model family
 */
function parseModelResponse(body, modelFamily) {
  switch (modelFamily) {
    case MODEL_FAMILIES.MISTRAL:
      if (!body.outputs || !body.outputs.length) {
        throw new Error("No valid content from Mistral model");
      }
      return body.outputs[0].text;
    
    case MODEL_FAMILIES.CLAUDE:
      if (!body.content || !body.content.length) {
        throw new Error("No valid content from Claude model");
      }
      return body.content[0].text;
    
    case MODEL_FAMILIES.NOVA:
    default:
      if (!body.output || !body.output.message?.content?.length) {
        throw new Error("No valid content from Nova model");
      }
      console.log(body.output.message.content[0].text);
      return body.output.message.content[0].text;
  }
}