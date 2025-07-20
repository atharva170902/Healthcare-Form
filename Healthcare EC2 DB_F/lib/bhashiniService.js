// lib/bhashiniService.js
import axios from 'axios';

class BhashiniService {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_BHASHINI_CALLBACK_URL || 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
    this.apiKey = process.env.NEXT_PUBLIC_BHASHINI_API_KEY;
    this.userId = process.env.NEXT_PUBLIC_BHASHINI_USER_ID;

    this.ulcaBaseURL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
    this.ulcaApiKey = process.env.NEXT_PUBLIC_ULCA_API_KEY ;
    this.ulcaUserId = process.env.NEXT_PUBLIC_ULCA_USER_ID ;

    if (!this.baseURL) {
      console.error('NEXT_PUBLIC_BHASHINI_CALLBACK_URL is not set');
      throw new Error('Bhashini URL not configured');
    }

    if (!this.apiKey) {
      console.error('NEXT_PUBLIC_BHASHINI_API_KEY is not set');
      console.warn('You need to set your Bhashini API key in environment variables');
    }

    console.log('Bhashini Service initialized with URL:', this.baseURL);

    this.languageMap = {
      'hi': 'hi',
      'bn': 'bn',
      'ta': 'ta',
      'te': 'te',
      'mr': 'mr',
      'en': 'en',
      'gu': 'gu',
      'kn': 'kn'
    };

    this.translationPipelines = {};
  }


  isSupportedIndianLanguage(lang) {
    const supportedLangs = ['hi', 'bn', 'ta', 'te', 'mr','gu','kn'];
    return supportedLangs.includes(lang);
  }

  getAsrServiceId(language) {
    const modelMap = {
      hi: "ai4bharat/conformer-hi-gpu--t4",
      ta: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
      te: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
      mr: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
      bn: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
      en: "ai4bharat/whisper-medium-en--gpu--t4",
      gu: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
      kn: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
    };

    return modelMap[language] || "ai4bharat/whisper-medium-en--gpu--t4";
  }

  async speechToText(audioData, language = 'en', audioFormat = 'webm', samplingRate = 16000) {
    try {
      const sourceLanguage = this.languageMap[language] || language;
      const serviceId = this.getAsrServiceId(sourceLanguage);

      this.validateAudioData(audioData);
      const cleanBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;

      const payload = {
        pipelineTasks: [{
          taskType: "asr",
          config: {
            language: {
              sourceLanguage: sourceLanguage
            },
            serviceId: serviceId,
            audioFormat: audioFormat,
            samplingRate: samplingRate
          }
        }],
        inputData: {
          audio: [{
            audioContent: cleanBase64
          }]
        }
      };

      console.log('Sending ASR request:', {
        language: sourceLanguage,
        serviceId: serviceId,
        audioFormat: audioFormat,
        samplingRate: samplingRate,
        audioDataLength: cleanBase64.length,
        payload: JSON.stringify(payload, null, 2)
      });

      const response = await axios.post(this.baseURL, payload, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Id': this.userId || ''
        },
        timeout: 30000
      });

      console.log('ASR response:', response.data);

      if (response.data?.pipelineResponse?.[0]?.output?.[0]?.source) {
        return response.data.pipelineResponse[0].output[0].source;
      } else if (response.data?.output?.[0]?.source) {
        return response.data.output[0].source;
      } else if (response.data?.data?.[0]?.output?.[0]?.source) {
        return response.data.data[0].output[0].source;
      } else {
        console.error('Unexpected ASR response format:', response.data);
        return '';
      }
    } catch (error) {
      console.error('Speech to text error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return '';
    }
  }

  async getTranslationPipeline(sourceLang) {
    const sourceLanguage = this.languageMap[sourceLang] || sourceLang;

    if (this.translationPipelines[sourceLanguage]) {
      return this.translationPipelines[sourceLanguage];
    }

    try {
      const payload = {
        pipelineTasks: [{
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: sourceLanguage
            }
          }
        }],
        pipelineRequestConfig: {
          pipelineId: "64392f96daac500b55c543cd"
        }
      };

      console.log('Getting translation pipeline for:', sourceLanguage);

      const response = await axios.post(this.ulcaBaseURL, payload, {
        headers: {
          'userID': this.ulcaUserId,
          'ulcaApiKey': this.ulcaApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log('Translation pipeline response:', response.data);

      this.translationPipelines[sourceLanguage] = response.data;
      return response.data;

    } catch (error) {
      console.error('Error getting translation pipeline:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async translateText(text, sourceLang = 'hi', targetLang = 'en') {
    try {
      const sourceLanguage = this.languageMap[sourceLang] || sourceLang;
      const targetLanguage = this.languageMap[targetLang] || targetLang;

      const pipelineData = await this.getTranslationPipeline(sourceLanguage);

      if (!pipelineData?.pipelineResponseConfig?.[0]?.config?.[0]?.callbackUrl) {
        throw new Error('No callback URL found in pipeline response');
      }

      const callbackUrl = pipelineData.pipelineResponseConfig[0].config[0].callbackUrl;
      const serviceId = pipelineData.pipelineResponseConfig[0].config[0].serviceId;

      const translationPayload = {
        pipelineTasks: [{
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: sourceLanguage,
              targetLanguage: targetLanguage
            },
            serviceId: serviceId
          }
        }],
        inputData: {
          input: [{
            source: text
          }]
        }
      };

      console.log('Sending translation request:', {
        sourceLanguage,
        targetLanguage,
        text,
        callbackUrl,
        serviceId
      });

      const response = await axios.post(callbackUrl, translationPayload, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Id': this.userId || ''
        },
        timeout: 15000
      });

      console.log('Translation response:', response.data);

      if (response.data?.pipelineResponse?.[0]?.output?.[0]?.target) {
        return response.data.pipelineResponse[0].output[0].target;
      } else if (response.data?.output?.[0]?.target) {
        return response.data.output[0].target;
      } else if (response.data?.data?.[0]?.output?.[0]?.target) {
        return response.data.data[0].output[0].target;
      }

      throw new Error('Invalid translation response format');
    } catch (error) {
      console.error('Translation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return text;
    }
  }

  async translateEnglishToIndian(text, targetLang) {
    try {
      const targetLanguage = this.languageMap[targetLang] || targetLang;

      if (targetLanguage === 'en') {
        throw new Error('Target language cannot be English for English-to-Indian translation');
      }

      const translationPayload = {
        pipelineTasks: [{
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: "en",
              targetLanguage: targetLanguage
            },
            serviceId: this.englishToIndianServiceId
          }
        }],
        inputData: {
          input: [{
            source: text
          }]
        }
      };

      console.log('Sending English-to-Indian translation request:', {
        sourceLanguage: "en",
        targetLanguage,
        text,
        serviceId: this.englishToIndianServiceId
      });

      const response = await axios.post(this.baseURL, translationPayload, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Id': this.userId || ''
        },
        timeout: 15000
      });

      console.log('English-to-Indian translation response:', response.data);

      if (response.data?.pipelineResponse?.[0]?.output?.[0]?.target) {
        return response.data.pipelineResponse[0].output[0].target;
      } else if (response.data?.output?.[0]?.target) {
        return response.data.output[0].target;
      } else if (response.data?.data?.[0]?.output?.[0]?.target) {
        return response.data.data[0].output[0].target;
      }

      throw new Error('Invalid English-to-Indian translation response format');
    } catch (error) {
      console.error('English-to-Indian translation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return text;
    }
  }

  async translateToEnglish(text, sourceLang) {
    return await this.translateText(text, sourceLang, 'en');
  }

  async translateFromEnglish(text, targetLang) {
    return await this.translateEnglishToIndian(text, targetLang);
  }

  validateAudioData(audioData) {
    if (!audioData || typeof audioData !== 'string') {
      throw new Error('Invalid audio data: must be a base64 string');
    }

    if (audioData.length < 50) {
      throw new Error('Audio data too short');
    }

    const cleanBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;

    try {
      atob(cleanBase64);
    } catch (e) {
      throw new Error('Invalid base64 audio data');
    }

    return true;
  }

  async audioFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async processAudioForASR(audioBlob, language = 'mr', audioFormat = 'flac', translateToEnglish = true) {
    try {
      const base64Audio = await this.audioFileToBase64(audioBlob);
      const transcription = await this.speechToText(base64Audio, language, audioFormat);

      if (translateToEnglish && transcription && transcription.trim() !== '') {
        try {
          const translation = await this.translateToEnglish(transcription, language);
          return {
            originalText: transcription,
            translatedText: translation,
            sourceLanguage: language
          };
        } catch (translationError) {
          console.warn('Translation failed, returning original transcription:', translationError);
          return {
            originalText: transcription,
            translatedText: transcription,
            sourceLanguage: language
          };
        }
      }

      return {
        originalText: transcription,
        translatedText: null,
        sourceLanguage: language
      };
    } catch (error) {
      console.error('Error processing audio for ASR:', error);
      throw error;
    }
  }
}

export default new BhashiniService();
