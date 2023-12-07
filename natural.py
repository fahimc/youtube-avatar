import os
import numpy as np
import nltk
import argparse
from pydub import AudioSegment
from scipy.io.wavfile import write as write_wav
import tempfile
from bark.generation import generate_text_semantic, preload_models
from bark import semantic_to_waveform, SAMPLE_RATE

def generate_mp3_from_script(input_text_file, output_mp3_file):
    # Download necessary NLTK data
    nltk.download('punkt')

    # Environment setup for Suno models
    os.environ["SUNO_OFFLOAD_CPU"] = "1"
    os.environ["SUNO_USE_SMALL_MODELS"] = "1"

    # Preload models
    preload_models()

    # Read script from file
    with open(input_text_file, 'r', encoding='utf-8') as file:
        script = file.read().replace("\n", " ").strip()

    # Splitting script into sentences
    sentences = nltk.sent_tokenize(script)
    GEN_TEMP = 0.6

    # Speaker configuration
    SPEAKER = "v2/en_speaker_6"
    silence = np.zeros(int(0.25 * SAMPLE_RATE))  # quarter second of silence

    # Generate audio for each sentence and add silence
    pieces = []
    for sentence in sentences:
        semantic_tokens = generate_text_semantic(
            sentence,
            history_prompt=SPEAKER,
            temp=GEN_TEMP,
            min_eos_p=0.05,  # this controls how likely the generation is to end
        )

        audio_array = semantic_to_waveform(semantic_tokens, history_prompt=SPEAKER)
        pieces += [audio_array, silence.copy()]

    # Concatenate all pieces
    final_audio_array = np.concatenate(pieces)

    # Normalize the audio array
    normalized_audio = np.int16(final_audio_array / np.max(np.abs(final_audio_array)) * 32767)

    # Use a temporary file to save the WAV
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
        temp_wav_name = temp_wav.name
        write_wav(temp_wav_name, SAMPLE_RATE, normalized_audio)

    # Read the WAV file with pydub
    audio_segment = AudioSegment.from_wav(temp_wav_name)

    # Export as MP3
    audio_segment.export(output_mp3_file, format="mp3")

    # Remove the temporary WAV file
    os.remove(temp_wav_name)

    print(f"Audio saved as MP3 at: {output_mp3_file}")

if __name__ == "__main__":
    # Set up argument parsing
    parser = argparse.ArgumentParser(description="Generate MP3 from a text script using TTS")
    parser.add_argument("input_text_file", type=str, help="Path to the input text file")
    parser.add_argument("output_mp3_file", type=str, help="Path and name of the output MP3 file")

    # Parse arguments
    args = parser.parse_args()

    # Generate MP3
    generate_mp3_from_script(args.input_text_file, args.output_mp3_file)
