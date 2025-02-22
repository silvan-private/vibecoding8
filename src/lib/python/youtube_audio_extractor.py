import yt_dlp
import os
from pydub import AudioSegment
import json
import sys
import tempfile
import shutil

def extract_audio(video_url, start_time, end_time):
    temp_dir = tempfile.mkdtemp()
    output_file = None
    
    try:
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'noprogress': True,
            'logger': None
        }

        # Download audio using yt-dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # First get video info
            try:
                info = ydl.extract_info(video_url, download=False)
                video_title = info.get('title', 'unknown_title')
                duration = info.get('duration', 0)
                
                # Validate time range
                if start_time >= duration or end_time > duration:
                    raise ValueError(f"Time range exceeds video duration of {duration} seconds")
                
                # Download the audio
                ydl.download([video_url])
                
            except Exception as e:
                raise Exception(f"Failed to download video: {str(e)}")

        # Find the downloaded file
        downloaded_file = None
        for file in os.listdir(temp_dir):
            if file.endswith('.mp3'):
                downloaded_file = os.path.join(temp_dir, file)
                break

        if not downloaded_file:
            raise Exception("Failed to find downloaded audio file")

        # Load the audio file
        audio = AudioSegment.from_mp3(downloaded_file)

        # Convert start and end times from seconds to milliseconds
        start_ms = int(float(start_time) * 1000)
        end_ms = int(float(end_time) * 1000)

        # Trim the audio
        trimmed_audio = audio[start_ms:end_ms]

        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.getcwd(), 'public', 'temp_audio')
        os.makedirs(output_dir, exist_ok=True)

        # Export the trimmed audio
        output_filename = f"{video_title}_{start_time}_{end_time}.mp3"
        output_file = os.path.join(output_dir, output_filename)
        trimmed_audio.export(output_file, format="mp3")

        # Return success response
        result = {
            "success": True,
            "message": "Audio extracted successfully",
            "output_file": f"/temp_audio/{output_filename}",
            "title": video_title,
            "duration": (end_ms - start_ms) / 1000  # Duration in seconds
        }
        print(json.dumps(result))
        sys.stdout.flush()

    except Exception as e:
        error_result = {
            "success": False,
            "message": str(e)
        }
        print(json.dumps(error_result))
        sys.stdout.flush()
    
    finally:
        # Clean up temp directory
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({
            "success": False,
            "message": "Usage: python youtube_audio_extractor.py <video_url> <start_time> <end_time>"
        }))
        sys.exit(1)

    video_url = sys.argv[1]
    start_time = float(sys.argv[2])
    end_time = float(sys.argv[3])
    extract_audio(video_url, start_time, end_time) 