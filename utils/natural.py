import os
import numpy as np
import nltk
import argparse
from pydub import AudioSegment
from scipy.io.wavfile import write as write_wav
import tempfile
from bark.generation import generate_text_semantic, preload_models
from bark import semantic_to_waveform, SAMPLE_RATE
import time  # Import time module

# Download necessary NLTK data outside the main function
nltk.download('punkt')

def generate_mp3_from_script(input_text_file, output_mp3_file):
    start_time = time.time()  # Start time measurement

    # Set environment variables for optimal performance
    os.environ["SUNO_OFFLOAD_CPU"] = "1"
    os.environ["SUNO_USE_SMALL_MODELS"] = "1"


    preload_models()

    with open(input_text_file, 'r', encoding='utf-8') as file:
        script = file.read().replace("\n", " ").strip()

    sentences = nltk.sent_tokenize(script)
    GEN_TEMP = 0.6
    SPEAKER = "v2/en_speaker_6"
    silence = np.zeros(int(0.25 * SAMPLE_RATE))  # quarter second of silence

    with tempfile.TemporaryFile(suffix='.wav') as temp_wav:
        for sentence in sentences:
            semantic_tokens = generate_text_semantic(
                sentence,
                history_prompt=SPEAKER,
                temp=GEN_TEMP,
                min_eos_p=0.05,
            )

            audio_array = semantic_to_waveform(semantic_tokens, history_prompt=SPEAKER)
            write_wav(temp_wav, SAMPLE_RATE, audio_array)
            write_wav(temp_wav, SAMPLE_RATE, silence)

        # Convert temporary WAV to MP3
        temp_wav.seek(0)
        audio_segment = AudioSegment.from_file(temp_wav, format='wav')
        audio_segment.export(output_mp3_file, format="mp3")

    end_time = time.time()  # End time measurement
    print(f"Audio saved as MP3 at: {output_mp3_file}")
    print(f"Time taken: {end_time - start_time:.2f} seconds")  # Print the time taken

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate MP3 from a text script using TTS")
    parser.add_argument("input_text_file", type=str, help="Path to the input text file")
    parser.add_argument("output_mp3_file", type=str, help="Path and name of the output MP3 file")
    args = parser.parse_args()
    generate_mp3_from_script(args.input_text_file, args.output_mp3_file)
