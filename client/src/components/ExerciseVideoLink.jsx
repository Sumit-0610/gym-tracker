import './ExerciseVideoLink.css';

// A link to the exercise's YouTube form tutorial. It opens YouTube in a new
// tab; the app never embeds the video, so nothing loads until it is tapped.
// Renders nothing when the exercise has no video.
export default function ExerciseVideoLink({ exercise, label = 'Watch how' }) {
  if (!exercise?.video_url) return null;
  return (
    <a
      className="exercise-video-link"
      href={exercise.video_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${exercise.name} tutorial on YouTube (opens in a new tab)`}
    >
      <span aria-hidden="true">▶</span> {label}
    </a>
  );
}
