import uvicorn

if __name__ == "__main__":
    print("Starting Diagnostic Audio Spectrum Visualizer Backend...")
    uvicorn.run("app:app", host="0.0.0.0", port=8008, reload=True)
