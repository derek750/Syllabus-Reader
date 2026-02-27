import os
from fastapi import FastAPI
from .routes import router

app = FastAPI(title="Syllabus Reader API")

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Syllabus Reader API"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
