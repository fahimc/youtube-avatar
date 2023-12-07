import torch
import os
import soundfile as sf
import tempfile
from pydub import AudioSegment

# Initialize parameters
language = 'en'
model_id = 'v3_en'
sample_rate = 48000
device = torch.device('cpu')

# Load the model
model, example_text = torch.hub.load(repo_or_dir='snakers4/silero-models',
                                     model='silero_tts',
                                     language=language,
                                     speaker=model_id)
model.to(device)  # Move model to the appropriate device (CPU in this case)

# Example text to be synthesized
example_text = 'In a world where artificial intelligence is reshaping our future, Microsoft just made a move that could change the game. Curious about what\'s happening at the forefront of AI innovation? Stay tuned!'

# Define the folder for saving audio files
folder_name = "speaker_mp3s"
os.makedirs(folder_name, exist_ok=True)

# Iterate over the range of speakers
for num in range(61, 91):  # 19 to 30 inclusive
    speaker = f'en_{num}'
    print(f"Generating audio for speaker: {speaker}")

    # Generate audio
    audio = model.apply_tts(text=example_text, speaker=speaker, sample_rate=sample_rate)

    # Convert tensor to numpy array
    audio_numpy = audio.numpy()

    # Use a temporary file to save the WAV
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
        temp_wav_name = temp_wav.name
        sf.write(temp_wav_name, audio_numpy, sample_rate)

    # Read the WAV file with pydub
    audio_segment = AudioSegment.from_wav(temp_wav_name)

    # Construct the path with folder and filename
    mp3_path = os.path.join(folder_name, f'{speaker}.mp3')

    # Save audio data to an MP3 file
    audio_segment.export(mp3_path, format="mp3")

    # Remove the temporary WAV file
    os.remove(temp_wav_name)

    print(f"Audio saved for speaker {speaker} at path: {mp3_path}")
