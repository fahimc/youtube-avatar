from bark import SAMPLE_RATE, generate_audio, preload_models
from IPython.display import Audio
from scipy.io.wavfile import write as write_wav
import os
os.environ["SUNO_OFFLOAD_CPU"] = "True"
os.environ["SUNO_USE_SMALL_MODELS"] = "True"
# get the current working directory
current_working_directory = os.getcwd()
# download and load all models
preload_models()

# generate audio from text
text_prompt = """
     Hello everyone! Today, we're exploring a major announcement: Microsoft's new role in OpenAI. If you're into tech news, hit that like button and subscribe for more insights.

Microsoft is now taking a non-voting, observer position on OpenAI’s board. This means they'll have access to insider info but won't directly influence decisions. It's a significant development, right?

Rewinding a bit, OpenAI, the team behind ChatGPT, has undergone some major shifts. With Sam Altman back as CEO and a new board, including Microsoft owning 49% of OpenAI, the dynamics are changing.

There's more to this story, and we'll delve into how this could impact the future of AI.

With Microsoft in this unique position, we're likely to see significant changes in AI development. Imagine the possibilities with Microsoft's resources and OpenAI's innovation combined!

What are your thoughts on this partnership? Will it lead to new AI breakthroughs? Share your opinions in the comments below.

To wrap up, Microsoft's new role with OpenAI marks a pivotal moment in the tech world. We'll keep a close eye on this story. Thanks for watching, and remember to subscribe for the latest updates.

Before you go, if you enjoyed this video, don't forget to like and subscribe. See you in the next one!
"""
audio_array = generate_audio(text_prompt, history_prompt="v2/en_speaker_3")

# play text in notebook
Audio(audio_array, rate=SAMPLE_RATE)
write_wav(current_working_directory+"/audio.wav", SAMPLE_RATE, audio_array)
