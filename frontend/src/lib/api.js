const API_BASE_URL = "http://127.0.0.1:8000";

export async function getMemories() {
  const response = await fetch(`${API_BASE_URL}/memories`);

  if (!response.ok) {
    throw new Error("Unable to load memories");
  }

  return response.json();
}

export async function createMemory(memory) {
  const response = await fetch(`${API_BASE_URL}/memories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(memory),
  });

  if (!response.ok) {
    throw new Error("Unable to save memory");
  }

  return response.json();
}

export async function askMemories(question) {
  const response = await fetch(
    `${API_BASE_URL}/ask?question=${encodeURIComponent(question)}`
  );

  if (!response.ok) {
    throw new Error("Unable to ask memories");
  }

  return response.json();
}

export async function uploadVoiceMemory(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/voice-memory`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Unable to process voice memory");
  }

  return response.json();
}

export async function uploadMemoryPhotos(memoryId, photos) {
  const formData = new FormData();

  photos.forEach((photo) => {
    formData.append("files", photo.file);
  });

  const response = await fetch(
    `${API_BASE_URL}/memories/${memoryId}/photos`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Unable to upload photos");
  }

  return response.json();
}

export async function uploadStandalonePhotos(photos) {
  const formData = new FormData();

  photos.forEach((photo) => {
    formData.append("files", photo);
  });

  const response = await fetch(
    `${API_BASE_URL}/photos`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Unable to upload photos");
  }

  return response.json();
}

export async function deleteStandalonePhoto(photoUrl) {
  const response = await fetch(
    `${API_BASE_URL}/photos?photo_url=${encodeURIComponent(photoUrl)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to delete photo");
  }

  return response.json();
}