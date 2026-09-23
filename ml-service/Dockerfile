FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
# Trains a model on first start if none exists (./ml-service is mounted, so it persists).
CMD ["sh", "-c", "[ -f models/latest.joblib ] || (python -m app.generate_sample_data && python -m app.train); exec uvicorn app.api:app --host 0.0.0.0 --port 8000"]
