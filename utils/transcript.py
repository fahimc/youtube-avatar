import whisper
import json
import sys

def transcribe_audio(input_audio_path, output_json_path):
    # Load the audio file
    audio = whisper.load_audio(input_audio_path)

    # Load the Whisper model
    model = whisper.load_model("tiny", device="cpu")

    # Transcribe the audio
    result = whisper.transcribe(model, audio, language="en")

    # Convert the result to a JSON string
    json_result = json.dumps(result, indent=2, ensure_ascii=False)

    # Save the result to a JSON file
    with open(output_json_path, 'w', encoding='utf-8') as f:
        f.write(json_result)

    print(f"Transcription saved to {output_json_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input_audio_path> <output_json_path>")
        sys.exit(1)

    input_audio_path = sys.argv[1]
    output_json_path = sys.argv[2]

    transcribe_audio(input_audio_path, output_json_path)
