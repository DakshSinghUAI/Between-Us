import whisper

print("Loading Whisper...")

model = whisper.load_model("base")

print("Whisper loaded!")
print("Transcribing audio...")

result = model.transcribe("test_voice.mp3")

print("\nTRANSCRIPTION:")
print(result["text"])