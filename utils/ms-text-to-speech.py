import torch
from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
from datasets import load_dataset
from pydub import AudioSegment
import numpy as np
import os
import argparse
import re

def split_text(text, max_length=1000):
    """Split text into chunks at periods or when the max_length is reached."""
    # Split at periods
    sentences = re.split(r'(?<=\.)\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence
        else:
            # If the current chunk is not empty, store it and start a new chunk
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence

    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(current_chunk)

    return chunks



def process_chunk(chunk, model, processor, speaker_embeddings, vocoder):
    # Process each text chunk
    inputs = processor(text=chunk, return_tensors="pt")
    with torch.no_grad():
        return model.generate_speech(inputs["input_ids"], speaker_embeddings, vocoder=vocoder)

# Parse command line arguments
parser = argparse.ArgumentParser(description="Text to Speech Conversion")
parser.add_argument("text_file", type=str, help="Path to the text file containing the text to synthesize")
parser.add_argument("output_path", type=str, help="Output path and filename for the MP3 file")
args = parser.parse_args()

# Load the dataset
embeddings_dataset = load_dataset("MikhailT/speaker-embeddings", 'utterance_embeddings')

# Load the vocoder and models
vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")
processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")

# Read text from the provided text file
with open(args.text_file, 'r', encoding='utf-8') as file:
    text = file.read()

# Split the text into chunks
max_chunk_length = 500  # Adjust as needed, below the model's limit
text_chunks = split_text(text, max_chunk_length)

# Target speaker ID
target_speaker_id = '021'
speaker_embeddings = None

# Find the record with the target speaker ID
for record in embeddings_dataset['cmu_arctic']:
    if record['speaker_id'] == target_speaker_id:
        speaker_embeddings = torch.tensor(record['embedding']).unsqueeze(0)
        break

if speaker_embeddings is not None:
    # Concatenate audio from each chunk
    full_audio = []

    for chunk in text_chunks:
        audio_output = process_chunk(chunk, model, processor, speaker_embeddings, vocoder)
        full_audio.append(audio_output.numpy().squeeze())

    # Normalize and convert to int16 format
    full_audio = np.concatenate(full_audio)
    full_audio = full_audio / np.max(np.abs(full_audio))
    full_audio = np.int16(full_audio * 32767)

    # Create an AudioSegment instance and export as MP3
    audio_segment = AudioSegment(full_audio.tobytes(), frame_rate=16000, sample_width=2, channels=1)
    audio_segment.export(args.output_path, format="mp3")
    print(f"Generated speech saved as {args.output_path}.")
else:
    print(f"Speaker with ID {target_speaker_id} not found.")
