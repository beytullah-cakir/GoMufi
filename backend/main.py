from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/")
def read_root():
    return {"Home": "Page"}

@app.get("/api/courses")
def read_courses():
    return {"courses": ["Course 1", "Course 2", "Course 3"]}


@app.get("/api/profile")
def read_profile():
    return {"username": "Beytullah Çakır", "email": "beytullah@example.com"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
