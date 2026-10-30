import { colorFor, initials } from '../utils/projectColor.js';

// A rounded square with the project's initials in its color.
export default function ProjectAvatar({ project, size = 'md' }) {
  return (
    <span className={`avatar avatar-${size}`} style={{ '--project': colorFor(project) }} aria-hidden>
      {initials(project.name)}
    </span>
  );
}
