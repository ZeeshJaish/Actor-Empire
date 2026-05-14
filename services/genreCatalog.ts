import { Genre, ProjectDetails, ProjectFormat } from '../types';

export const ALL_GENRES: Genre[] = [
    'ACTION',
    'DRAMA',
    'COMEDY',
    'ROMANCE',
    'THRILLER',
    'HORROR',
    'SCI_FI',
    'ADVENTURE',
    'SUPERHERO',
    'MUSICAL',
    'BIOPIC',
    'SPORTS',
    'ANIMATION',
    'FANTASY',
    'CRIME',
    'DOCUMENTARY',
];

export const PROJECT_FORMATS: ProjectFormat[] = ['LIVE_ACTION', 'ANIMATED', 'ANIME'];

export const GENRE_LABELS: Record<Genre, string> = {
    ACTION: 'Action',
    DRAMA: 'Drama',
    COMEDY: 'Comedy',
    ROMANCE: 'Romance',
    THRILLER: 'Thriller',
    HORROR: 'Horror',
    SCI_FI: 'Sci-Fi',
    ADVENTURE: 'Adventure',
    SUPERHERO: 'Superhero',
    MUSICAL: 'Musical',
    BIOPIC: 'Biopic',
    SPORTS: 'Sports',
    ANIMATION: 'Animation',
    FANTASY: 'Fantasy',
    CRIME: 'Crime',
    DOCUMENTARY: 'Documentary',
};

export const PROJECT_FORMAT_LABELS: Record<ProjectFormat, string> = {
    LIVE_ACTION: 'Live Action',
    ANIMATED: 'Animated Feature',
    ANIME: 'Anime Film',
};

export const formatGenreLabel = (genre: string): string => GENRE_LABELS[genre as Genre] || genre.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export const formatProjectFormatLabel = (format?: ProjectFormat): string => format ? PROJECT_FORMAT_LABELS[format] : PROJECT_FORMAT_LABELS.LIVE_ACTION;

export const getProjectIdentityLabel = (project?: Pick<ProjectDetails, 'genre' | 'format' | 'subjectName'>): string => {
    if (!project) return 'Movie';
    const pieces = [formatProjectFormatLabel(project.format), formatGenreLabel(project.genre)];
    if (project.subjectName) pieces.push(project.subjectName);
    return pieces.join(' • ');
};

export const createDefaultGenreXP = (): Record<string, number> => ALL_GENRES.reduce((acc, genre) => {
    acc[genre] = 0;
    return acc;
}, {} as Record<string, number>);

export const hydrateGenreXP = (genreXP?: Record<string, number>): Record<string, number> => ({
    ...createDefaultGenreXP(),
    ...(genreXP || {}),
});

export const isSubjectDrivenGenre = (genre?: Genre | ''): boolean => genre === 'BIOPIC' || genre === 'DOCUMENTARY';
