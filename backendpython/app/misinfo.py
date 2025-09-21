from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
import re

app = FastAPI()

class VideoRequest(BaseModel):
    url: str

def extract_youtube_id(url: str):
    if not url:
        return None
    
    patterns = [
        r"(?:v=|vi=)([0-9A-Za-z_-]{11})",
        r"(?:v/|vi/)([0-9A-Za-z_-]{11})",
        r"youtu\.be/([0-9A-Za-z_-]{11})",
        r"youtube\.com/embed/([0-9A-Za-z_-]{11})"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@app.post("/transcript/video")
def get_transcript(req: VideoRequest):
    video_id = extract_youtube_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    try:
        
        yt_api = YouTubeTranscriptApi()
        transcript = yt_api.fetch(video_id)
        transcript_text = " ".join([snippet.text for snippet in transcript])

        if not transcript:
            raise HTTPException(status_code=404, detail="Transcript not available")
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Transcript unavailable: {str(e)}")

    return {
        "success": True,
        "video_id": video_id,
        "transcript": transcript_text
    }
