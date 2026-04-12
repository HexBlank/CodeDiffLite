from app.app import app
from app.config import APP_NAME, HOST, PORT


if __name__ == "__main__":
    import uvicorn

    display_host = HOST if HOST != "0.0.0.0" else "localhost"
    print(f"[{APP_NAME}] Server started!")
    print(f"Access: http://{display_host}:{PORT}")
    print(f"API Docs: http://{display_host}:{PORT}/docs")
    uvicorn.run(app, host=HOST, port=PORT)
