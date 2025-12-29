# IntelliStudy

IntelliStudy is an advanced educational platform designed to enhance learning experiences through AI-driven tools, analytics, and interactive study features. This project leverages modern web technologies and AI frameworks to provide a comprehensive learning environment.

## Features

- **AI-Powered Tutoring**: Real-time voice and chat-based tutoring using AI.
- **Learning Analytics**: Insights into study patterns and performance metrics.
- **Interactive Study Tools**: Flashcards, quizzes, and a collaborative study workspace.
- **Lecture Management**: Tools for recording and managing lectures.
- **Content Management**: Upload and manage study materials like PDFs.
- **Webcam Tracking**: Monitor engagement during study sessions.

## Project Structure

The project is organized as follows:

```
components/
  ai/                # AI tutoring components
  analytics/         # Learning analytics components
  content/           # Content management components
  lecture/           # Lecture management components
  study/             # Study tools components
  ui/                # Reusable UI components
hooks/               # Custom React hooks
public/              # Static assets
server/              # Backend server files
services/            # Service layer for external integrations
utils/               # Utility functions
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/intellistudy.git
   ```

2. Navigate to the project directory:
   ```bash
   cd intellistudy
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Server

To start the development server, run:
```bash
npm run dev
```
This will concurrently start the backend server and the Vite development server.

### Build for Production

To build the project for production, run:
```bash
npm run build
```

### Preview Production Build

To preview the production build, run:
```bash
npm run preview
```

## Technologies Used

- **Frontend**: React, Vite
- **Backend**: Express, PostgreSQL
- **AI**: Google GenAI, MediaPipe Vision
- **Styling**: Lucide React
- **Utilities**: Multer, Dotenv, Cors

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- [Google GenAI](https://ai.google/tools/) for AI capabilities.
- [MediaPipe](https://mediapipe.dev/) for vision-based tools.
- [Vite](https://vitejs.dev/) for fast development builds.

## Screenshots

Here are some screenshots showcasing the application:

![Screenshot 1](Screenshot%202025-12-13%20at%202.39.57%E2%80%AFPM.png)
![Screenshot 2](Screenshot%202025-12-13%20at%203.40.13%E2%80%AFPM.png)
![Screenshot 3](Screenshot%202025-12-13%20at%203.42.37%E2%80%AFPM.png)
![Screenshot 4](Screenshot%202025-12-13%20at%203.42.55%E2%80%AFPM.png)
![Screenshot 5](Screenshot%202025-12-13%20at%203.41.02%E2%80%AFPM.png)
![Screenshot 6](Screenshot%202025-12-13%20at%203.41.16%E2%80%AFPM.png)

---

Happy Learning!