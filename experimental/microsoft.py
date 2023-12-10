import torch
from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
from datasets import load_dataset
from pydub import AudioSegment
import numpy as np
import os

# Load the dataset
embeddings_dataset = load_dataset("MikhailT/speaker-embeddings", 'utterance_embeddings')

# Load the vocoder and models
vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")
processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")

# Text to be synthesized
text = "Hello everyone! Today, we're exploring a major announcement: Microsoft's new role in OpenAI."

# Create a directory for the MP3 files
output_dir = "speaker_audio"
os.makedirs(output_dir, exist_ok=True)

# Iterate through speaker IDs from 10 to 30
for speaker_id in range(30, 51):
    target_speaker_id = str(speaker_id).zfill(3)
    speaker_embeddings = None

    # Find the record with the target speaker ID
    for record in embeddings_dataset['cmu_arctic']:
        if record['speaker_id'] == target_speaker_id:
            speaker_embeddings = torch.tensor(record['embedding']).unsqueeze(0)
            break

    # Generate speech if speaker embeddings are found
    if speaker_embeddings is not None:
        inputs = processor(text=text, return_tensors="pt")
        with torch.no_grad():
            model_output = model.generate_speech(inputs["input_ids"], speaker_embeddings, vocoder=vocoder)

        # Convert model output to numpy array
        audio_data = model_output.numpy().squeeze()

        # Normalize the audio to prevent distortion
        audio_data = audio_data / np.max(np.abs(audio_data))

        # Convert to int16 format (required by pydub)
        audio_data = np.int16(audio_data * 32767)

        # Create an AudioSegment instance
        audio_segment = AudioSegment(audio_data.tobytes(), frame_rate=16000, sample_width=2, channels=1)

        # Export as MP3
        mp3_filename = os.path.join(output_dir, f"speaker_{target_speaker_id}.mp3")
        audio_segment.export(mp3_filename, format="mp3")
        print(f"Generated speech for speaker ID {target_speaker_id} saved as {mp3_filename}.")
    else:
        print(f"Speaker with ID {target_speaker_id} not found. Skipping to the next speaker.")
