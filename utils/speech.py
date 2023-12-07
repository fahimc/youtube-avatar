import torch
import os
import tempfile
from pydub import AudioSegment
import argparse
import soundfile as sf
import re

def split_text(text, max_length=1000):
    """Split text into chunks at full stops or commas, respecting the max_length."""
    sentences = re.split(r'(?<=[.,])\s+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length or not current_chunk:
            current_chunk += (sentence + ' ')
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + ' '
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

def generate_mp3(text_file, output_path):
    # Initialize parameters
    language = 'en'
    model_id = 'v3_en'
    sample_rate = 48000
    device = torch.device('cpu')
    speaker = 'en_77'

    # Load the model
    model, _ = torch.hub.load(repo_or_dir='snakers4/silero-models',
                              model='silero_tts',
                              language=language,
                              speaker=model_id)
    model.to(device)

    # Read text from file
    with open(text_file, 'r', encoding='utf-8') as file:
        text = file.read()

    # Split text into chunks
    text_chunks = split_text(text)

    # Initialize an empty AudioSegment for concatenating
    full_audio_segment = AudioSegment.silent(duration=0)

    # Process each chunk
    for chunk in text_chunks:
        # Generate audio
        audio = model.apply_tts(text=chunk, speaker=speaker, sample_rate=sample_rate)

        # Convert tensor to numpy array
        audio_numpy = audio.numpy()

        # Use a temporary file to save the WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_wav_name = temp_wav.name
            sf.write(temp_wav_name, audio_numpy, sample_rate)

        # Read the WAV file with pydub
        audio_segment = AudioSegment.from_wav(temp_wav_name)

        # Concatenate to the full audio
        full_audio_segment += audio_segment

        # Remove the temporary WAV file
        os.remove(temp_wav_name)

    # Save the full audio data to an MP3 file
    full_audio_segment.export(output_path, format="mp3")

if __name__ == "__main__":
    # Set up argument parsing
    parser = argparse.ArgumentParser(description="Generate MP3 from text using TTS")
    parser.add_argument("text_file", type=str, help="Path to the input text file")
    parser.add_argument("output_path", type=str, help="Path and name of the output MP3 file")

    # Parse arguments
    args = parser.parse_args()

    # Generate MP3
    generate_mp3(args.text_file, args.output_path)
