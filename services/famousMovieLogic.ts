
import { GameLanguage, Genre, Player, ProjectDetails, AuditionOpportunity, RoleType, ProjectHiddenStats, StudioId, ProjectType } from '../types';
import { ROLE_DEFINITIONS } from './roleLogic';
import { getPlayerLanguage, t } from './i18n';

interface FamousProjectDef {
    title: string;
    genre: Genre;
    director: string; // Showrunner for TV
    difficulty: number; // 0-100
    studioId: StudioId;
    prestige: number; 
    description: string;
    type: ProjectType;
}

// 🎬 CURATED LIST OF FAMOUS MOVIES
export const FAMOUS_MOVIE_DB: FamousProjectDef[] = [
    // 🎭 PRESTIGE / AWARD GIANTS
    { title: "The Godfather", genre: "DRAMA", director: "Francis Ford Coppola", difficulty: 95, studioId: "PARAMOUNT", prestige: 100, description: '', type: 'MOVIE' },
    { title: "Forrest Gump", genre: "DRAMA", director: "Robert Zemeckis", difficulty: 85, studioId: "PARAMOUNT", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Titanic", genre: "ROMANCE", director: "James Cameron", difficulty: 88, studioId: "PARAMOUNT", prestige: 95, description: '', type: 'MOVIE' },
    { title: "The Shawshank Redemption", genre: "DRAMA", director: "Frank Darabont", difficulty: 90, studioId: "WARNER_BROS", prestige: 98, description: '', type: 'MOVIE' },
    { title: "Schindler's List", genre: "DRAMA", director: "Steven Spielberg", difficulty: 95, studioId: "UNIVERSAL", prestige: 100, description: '', type: 'MOVIE' },
    { title: "Gladiator", genre: "ACTION", director: "Ridley Scott", difficulty: 85, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Parasite", genre: "THRILLER", director: "Bong Joon-ho", difficulty: 92, studioId: "ARTISAN_PICTURES", prestige: 99, description: '', type: 'MOVIE' },
    { title: "Knives Out", genre: "MYSTERY", director: "Rian Johnson", difficulty: 78, studioId: "ARTISAN_PICTURES", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Gone Girl", genre: "MYSTERY", director: "David Fincher", difficulty: 86, studioId: "ARTISAN_PICTURES", prestige: 90, description: '', type: 'MOVIE' },
    { title: "La La Land", genre: "ROMANCE", director: "Damien Chazelle", difficulty: 80, studioId: "ARTISAN_PICTURES", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Oppenheimer", genre: "DRAMA", director: "Christopher Nolan", difficulty: 92, studioId: "UNIVERSAL", prestige: 98, description: '', type: 'MOVIE' },
    { title: "Whiplash", genre: "DRAMA", director: "Damien Chazelle", difficulty: 84, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Social Network", genre: "DRAMA", director: "David Fincher", difficulty: 86, studioId: "ARTISAN_PICTURES", prestige: 93, description: '', type: 'MOVIE' },
    { title: "The Prestige", genre: "MYSTERY", director: "Christopher Nolan", difficulty: 88, studioId: "WARNER_BROS", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Green Mile", genre: "DRAMA", director: "Frank Darabont", difficulty: 84, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Saving Private Ryan", genre: "DRAMA", director: "Steven Spielberg", difficulty: 92, studioId: "DREAMWORKS", prestige: 96, description: '', type: 'MOVIE' },
    { title: "A Beautiful Mind", genre: "BIOPIC", director: "Ron Howard", difficulty: 84, studioId: "UNIVERSAL", prestige: 90, description: '', type: 'MOVIE' },

    // 🧠 HIGH-CONCEPT / CULT ICONS
    { title: "Inception", genre: "SCI_FI", director: "Christopher Nolan", difficulty: 85, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Fight Club", genre: "THRILLER", director: "David Fincher", difficulty: 88, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Memento", genre: "MYSTERY", director: "Christopher Nolan", difficulty: 86, studioId: "SEARCHLIGHT", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Interstellar", genre: "SCI_FI", director: "Christopher Nolan", difficulty: 85, studioId: "PARAMOUNT", prestige: 90, description: '', type: 'MOVIE' },
    { title: "The Matrix", genre: "SCI_FI", director: "The Wachowskis", difficulty: 82, studioId: "WARNER_BROS", prestige: 95, description: '', type: 'MOVIE' },
    { title: "Joker", genre: "DRAMA", director: "Todd Phillips", difficulty: 90, studioId: "WARNER_BROS", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Dark Knight", genre: "ACTION", director: "Christopher Nolan", difficulty: 95, studioId: "WARNER_BROS", prestige: 98, description: '', type: 'MOVIE' },
    { title: "Dune", genre: "SCI_FI", director: "Denis Villeneuve", difficulty: 88, studioId: "WARNER_BROS", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Avatar", genre: "SCI_FI", director: "James Cameron", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Blade Runner 2049", genre: "SCI_FI", director: "Denis Villeneuve", difficulty: 90, studioId: "WARNER_BROS", prestige: 93, description: '', type: 'MOVIE' },

    // 🔥 ACTION / THRILLER LEGENDS
    { title: "John Wick", genre: "ACTION", director: "Chad Stahelski", difficulty: 75, studioId: "ARTISAN_PICTURES", prestige: 80, description: '', type: 'MOVIE' },
    { title: "Mad Max: Fury Road", genre: "ACTION", director: "George Miller", difficulty: 80, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Die Hard", genre: "ACTION", director: "John McTiernan", difficulty: 70, studioId: "ARTISAN_PICTURES", prestige: 85, description: '', type: 'MOVIE' },
    { title: "The Bourne Identity", genre: "ACTION", director: "Doug Liman", difficulty: 75, studioId: "UNIVERSAL", prestige: 80, description: '', type: 'MOVIE' },
    { title: "Taken", genre: "ACTION", director: "Pierre Morel", difficulty: 65, studioId: "ARTISAN_PICTURES", prestige: 70, description: '', type: 'MOVIE' },
    { title: "Top Gun: Maverick", genre: "ACTION", director: "Joseph Kosinski", difficulty: 82, studioId: "PARAMOUNT", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Mission: Impossible - Fallout", genre: "ACTION", director: "Christopher McQuarrie", difficulty: 84, studioId: "PARAMOUNT", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Jurassic Park", genre: "ADVENTURE", director: "Steven Spielberg", difficulty: 78, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Back to the Future", genre: "SCI_FI", director: "Robert Zemeckis", difficulty: 76, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'MOVIE' },
    { title: "E.T. the Extra-Terrestrial", genre: "ADVENTURE", director: "Steven Spielberg", difficulty: 76, studioId: "UNIVERSAL", prestige: 93, description: '', type: 'MOVIE' },
    { title: "Jaws", genre: "THRILLER", director: "Steven Spielberg", difficulty: 82, studioId: "UNIVERSAL", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Raiders of the Lost Ark", genre: "ADVENTURE", director: "Steven Spielberg", difficulty: 80, studioId: "LUCASFILM", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Rocky", genre: "SPORTS", director: "John G. Avildsen", difficulty: 72, studioId: "PARAMOUNT", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Creed", genre: "SPORTS", director: "Ryan Coogler", difficulty: 76, studioId: "WARNER_BROS", prestige: 84, description: '', type: 'MOVIE' },
    { title: "Heat", genre: "CRIME", director: "Michael Mann", difficulty: 88, studioId: "WARNER_BROS", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Casino Royale", genre: "ACTION", director: "Martin Campbell", difficulty: 82, studioId: "SONY_PICTURES", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Skyfall", genre: "ACTION", director: "Sam Mendes", difficulty: 84, studioId: "SONY_PICTURES", prestige: 90, description: '', type: 'MOVIE' },
    { title: "The Hunger Games", genre: "ADVENTURE", director: "Gary Ross", difficulty: 74, studioId: "LIONSGATE", prestige: 82, description: '', type: 'MOVIE' },

    // 😄 COMEDY / FEEL-GOOD CLASSICS
    { title: "The Hangover", genre: "COMEDY", director: "Todd Phillips", difficulty: 60, studioId: "WARNER_BROS", prestige: 75, description: '', type: 'MOVIE' },
    { title: "Home Alone", genre: "COMEDY", director: "Chris Columbus", difficulty: 55, studioId: "ARTISAN_PICTURES", prestige: 80, description: '', type: 'MOVIE' },
    { title: "The Grand Budapest Hotel", genre: "COMEDY", director: "Wes Anderson", difficulty: 85, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Wolf of Wall Street", genre: "COMEDY", director: "Martin Scorsese", difficulty: 90, studioId: "PARAMOUNT", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Barbie", genre: "COMEDY", director: "Greta Gerwig", difficulty: 82, studioId: "WARNER_BROS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Mean Girls", genre: "COMEDY", director: "Mark Waters", difficulty: 58, studioId: "PARAMOUNT", prestige: 78, description: '', type: 'MOVIE' },
    { title: "A Star Is Born", genre: "MUSICAL", director: "Bradley Cooper", difficulty: 84, studioId: "WARNER_BROS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "The Breakfast Club", genre: "COMEDY", director: "John Hughes", difficulty: 64, studioId: "UNIVERSAL", prestige: 82, description: '', type: 'MOVIE' },
    { title: "Twilight", genre: "ROMANCE", director: "Catherine Hardwicke", difficulty: 62, studioId: "LIONSGATE", prestige: 72, description: '', type: 'MOVIE' },
    { title: "Mamma Mia!", genre: "MUSICAL", director: "Phyllida Lloyd", difficulty: 64, studioId: "UNIVERSAL", prestige: 78, description: '', type: 'MOVIE' },
    { title: "Bohemian Rhapsody", genre: "BIOPIC", director: "Bryan Singer", difficulty: 76, studioId: "ARTISAN_PICTURES", prestige: 82, description: '', type: 'MOVIE' },

    // 🩸 HORROR / DARK CULT
    { title: "The Exorcist", genre: "HORROR", director: "William Friedkin", difficulty: 88, studioId: "WARNER_BROS", prestige: 95, description: '', type: 'MOVIE' },
    { title: "Alien", genre: "HORROR", director: "Ridley Scott", difficulty: 86, studioId: "ARTISAN_PICTURES", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Aliens", genre: "ACTION", director: "James Cameron", difficulty: 84, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Terminator", genre: "SCI_FI", director: "James Cameron", difficulty: 80, studioId: "MGM", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Terminator 2: Judgment Day", genre: "ACTION", director: "James Cameron", difficulty: 86, studioId: "MGM", prestige: 93, description: '', type: 'MOVIE' },
    { title: "Get Out", genre: "HORROR", director: "Jordan Peele", difficulty: 85, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'MOVIE' },
    { title: "A Quiet Place", genre: "HORROR", director: "John Krasinski", difficulty: 75, studioId: "PARAMOUNT", prestige: 85, description: '', type: 'MOVIE' },
    { title: "Hereditary", genre: "HORROR", director: "Ari Aster", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Scream", genre: "HORROR", director: "Wes Craven", difficulty: 70, studioId: "PARAMOUNT", prestige: 84, description: '', type: 'MOVIE' },

    // 🌍 EXTRA REAL-WORLD FAMOUS PROJECT PIPELINE
    { title: "The Lord of the Rings: The Fellowship of the Ring", genre: "FANTASY", director: "Peter Jackson", difficulty: 90, studioId: "WARNER_BROS", prestige: 97, description: '', type: 'MOVIE' },
    { title: "The Lord of the Rings: The Return of the King", genre: "FANTASY", director: "Peter Jackson", difficulty: 94, studioId: "WARNER_BROS", prestige: 100, description: '', type: 'MOVIE' },
    { title: "Harry Potter and the Sorcerer's Stone", genre: "FANTASY", director: "Chris Columbus", difficulty: 74, studioId: "WARNER_BROS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Avengers: Endgame", genre: "SUPERHERO", director: "Anthony and Joe Russo", difficulty: 92, studioId: "DISNEY_PLUS", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Black Panther", genre: "SUPERHERO", director: "Ryan Coogler", difficulty: 86, studioId: "DISNEY_PLUS", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Spider-Man: No Way Home", genre: "SUPERHERO", director: "Jon Watts", difficulty: 84, studioId: "DISNEY_PLUS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "The Batman", genre: "SUPERHERO", director: "Matt Reeves", difficulty: 88, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Logan", genre: "SUPERHERO", director: "James Mangold", difficulty: 88, studioId: "ARTISAN_PICTURES", prestige: 91, description: '', type: 'MOVIE' },
    { title: "Deadpool", genre: "SUPERHERO", director: "Tim Miller", difficulty: 74, studioId: "ARTISAN_PICTURES", prestige: 82, description: '', type: 'MOVIE' },
    { title: "Frozen", genre: "ANIMATION", director: "Chris Buck and Jennifer Lee", difficulty: 70, studioId: "DISNEY_PLUS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "Toy Story", genre: "ANIMATION", director: "John Lasseter", difficulty: 78, studioId: "PIXAR", prestige: 94, description: '', type: 'MOVIE' },
    { title: "Coco", genre: "ANIMATION", director: "Lee Unkrich", difficulty: 80, studioId: "PIXAR", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Inside Out", genre: "ANIMATION", director: "Pete Docter", difficulty: 80, studioId: "PIXAR", prestige: 91, description: '', type: 'MOVIE' },
    { title: "The Incredibles", genre: "ANIMATION", director: "Brad Bird", difficulty: 78, studioId: "PIXAR", prestige: 90, description: '', type: 'MOVIE' },
    { title: "Shrek", genre: "ANIMATION", director: "Andrew Adamson and Vicky Jenson", difficulty: 72, studioId: "DREAMWORKS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "How to Train Your Dragon", genre: "ANIMATION", director: "Dean DeBlois", difficulty: 74, studioId: "DREAMWORKS", prestige: 86, description: '', type: 'MOVIE' },
    { title: "No Country for Old Men", genre: "CRIME", director: "Joel and Ethan Coen", difficulty: 92, studioId: "PARAMOUNT", prestige: 97, description: '', type: 'MOVIE' },
    { title: "Pulp Fiction", genre: "CRIME", director: "Quentin Tarantino", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 96, description: '', type: 'MOVIE' },
    { title: "The Departed", genre: "CRIME", director: "Martin Scorsese", difficulty: 88, studioId: "WARNER_BROS", prestige: 93, description: '', type: 'MOVIE' },
    { title: "Goodfellas", genre: "CRIME", director: "Martin Scorsese", difficulty: 92, studioId: "WARNER_BROS", prestige: 98, description: '', type: 'MOVIE' },
    { title: "The Silence of the Lambs", genre: "THRILLER", director: "Jonathan Demme", difficulty: 92, studioId: "ARTISAN_PICTURES", prestige: 98, description: '', type: 'MOVIE' },
    { title: "Se7en", genre: "THRILLER", director: "David Fincher", difficulty: 88, studioId: "ARTISAN_PICTURES", prestige: 91, description: '', type: 'MOVIE' },
    { title: "The Sixth Sense", genre: "MYSTERY", director: "M. Night Shyamalan", difficulty: 82, studioId: "DISNEY_PLUS", prestige: 88, description: '', type: 'MOVIE' },
    { title: "The Truman Show", genre: "DRAMA", director: "Peter Weir", difficulty: 84, studioId: "PARAMOUNT", prestige: 91, description: '', type: 'MOVIE' },
    { title: "Everything Everywhere All at Once", genre: "SCI_FI", director: "Daniel Kwan and Daniel Scheinert", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 96, description: '', type: 'MOVIE' },
    { title: "The Revenant", genre: "ADVENTURE", director: "Alejandro G. Inarritu", difficulty: 94, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "The Martian", genre: "SCI_FI", director: "Ridley Scott", difficulty: 78, studioId: "ARTISAN_PICTURES", prestige: 86, description: '', type: 'MOVIE' },
    { title: "Arrival", genre: "SCI_FI", director: "Denis Villeneuve", difficulty: 88, studioId: "PARAMOUNT", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Gravity", genre: "SCI_FI", director: "Alfonso Cuaron", difficulty: 86, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'MOVIE' },
    { title: "The Devil Wears Prada", genre: "COMEDY", director: "David Frankel", difficulty: 68, studioId: "ARTISAN_PICTURES", prestige: 80, description: '', type: 'MOVIE' },
    { title: "Crazy Rich Asians", genre: "ROMANCE", director: "Jon M. Chu", difficulty: 70, studioId: "WARNER_BROS", prestige: 82, description: '', type: 'MOVIE' },
    { title: "Bridesmaids", genre: "COMEDY", director: "Paul Feig", difficulty: 68, studioId: "UNIVERSAL", prestige: 80, description: '', type: 'MOVIE' },
    { title: "The Conjuring", genre: "HORROR", director: "James Wan", difficulty: 78, studioId: "WARNER_BROS", prestige: 84, description: '', type: 'MOVIE' },
    { title: "It", genre: "HORROR", director: "Andy Muschietti", difficulty: 76, studioId: "WARNER_BROS", prestige: 82, description: '', type: 'MOVIE' },
    { title: "Minari", genre: "DRAMA", director: "Lee Isaac Chung", difficulty: 86, studioId: "ARTISAN_PICTURES", prestige: 92, description: '', type: 'MOVIE' },
    { title: "Moonlight", genre: "DRAMA", director: "Barry Jenkins", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 97, description: '', type: 'MOVIE' },
    { title: "The King's Speech", genre: "BIOPIC", director: "Tom Hooper", difficulty: 84, studioId: "ARTISAN_PICTURES", prestige: 90, description: '', type: 'MOVIE' }
];

// 📺 CURATED LIST OF FAMOUS TV SERIES
export const FAMOUS_SERIES_DB: FamousProjectDef[] = [
    { title: "The Big Bang Theory", genre: "COMEDY", director: "Chuck Lorre", difficulty: 60, studioId: "WARNER_BROS", prestige: 85, description: '', type: 'SERIES' },
    { title: "Grey's Anatomy", genre: "DRAMA", director: "Shonda Rhimes", difficulty: 70, studioId: "DISNEY_PLUS", prestige: 88, description: '', type: 'SERIES' },
    { title: "Game of Thrones", genre: "ADVENTURE", director: "HBO", difficulty: 95, studioId: "HBO", prestige: 99, description: '', type: 'SERIES' },
    { title: "Breaking Bad", genre: "THRILLER", director: "Vince Gilligan", difficulty: 92, studioId: "ARTISAN_PICTURES", prestige: 100, description: '', type: 'SERIES' },
    { title: "Friends", genre: "COMEDY", director: "David Crane", difficulty: 65, studioId: "WARNER_BROS", prestige: 90, description: '', type: 'SERIES' },
    { title: "Stranger Things", genre: "SCI_FI", director: "The Duffer Brothers", difficulty: 80, studioId: "NETFLIX", prestige: 92, description: '', type: 'SERIES' },
    { title: "The Office", genre: "COMEDY", director: "Greg Daniels", difficulty: 60, studioId: "UNIVERSAL", prestige: 88, description: '', type: 'SERIES' },
    { title: "Succession", genre: "DRAMA", director: "Jesse Armstrong", difficulty: 90, studioId: "HBO", prestige: 98, description: '', type: 'SERIES' },
    { title: "Lost", genre: "SCI_FI", director: "J.J. Abrams", difficulty: 80, studioId: "DISNEY_PLUS", prestige: 85, description: '', type: 'SERIES' },
    { title: "The Sopranos", genre: "THRILLER", director: "David Chase", difficulty: 95, studioId: "HBO", prestige: 100, description: '', type: 'SERIES' },
    { title: "Seinfeld", genre: "COMEDY", director: "Larry David", difficulty: 70, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'SERIES' },
    { title: "House of Cards", genre: "DRAMA", director: "David Fincher", difficulty: 85, studioId: "NETFLIX", prestige: 90, description: '', type: 'SERIES' },
    { title: "Black Mirror", genre: "SCI_FI", director: "Charlie Brooker", difficulty: 88, studioId: "NETFLIX", prestige: 94, description: '', type: 'SERIES' },
    { title: "The Mandalorian", genre: "SCI_FI", director: "Jon Favreau", difficulty: 85, studioId: "LUCASFILM", prestige: 92, description: '', type: 'SERIES' },
    { title: "Ted Lasso", genre: "COMEDY", director: "Bill Lawrence", difficulty: 65, studioId: "APPLE_TV", prestige: 90, description: '', type: 'SERIES' },
    { title: "The Last of Us", genre: "DRAMA", director: "Craig Mazin", difficulty: 88, studioId: "HBO", prestige: 94, description: '', type: 'SERIES' },
    { title: "House of the Dragon", genre: "FANTASY", director: "Ryan Condal", difficulty: 90, studioId: "HBO", prestige: 91, description: '', type: 'SERIES' },
    { title: "The White Lotus", genre: "DRAMA", director: "Mike White", difficulty: 82, studioId: "HBO", prestige: 92, description: '', type: 'SERIES' },
    { title: "True Detective", genre: "CRIME", director: "Nic Pizzolatto", difficulty: 88, studioId: "HBO", prestige: 93, description: '', type: 'SERIES' },
    { title: "Sherlock", genre: "MYSTERY", director: "Steven Moffat", difficulty: 82, studioId: "HBO", prestige: 88, description: '', type: 'SERIES' },
    { title: "Only Murders in the Building", genre: "MYSTERY", director: "John Hoffman", difficulty: 74, studioId: "HULU", prestige: 84, description: '', type: 'SERIES' },
    { title: "The Wire", genre: "CRIME", director: "David Simon", difficulty: 92, studioId: "HBO", prestige: 100, description: '', type: 'SERIES' },
    { title: "Chernobyl", genre: "DRAMA", director: "Craig Mazin", difficulty: 90, studioId: "HBO", prestige: 97, description: '', type: 'SERIES' },
    { title: "Euphoria", genre: "DRAMA", director: "Sam Levinson", difficulty: 82, studioId: "HBO", prestige: 86, description: '', type: 'SERIES' },
    { title: "Yellowstone", genre: "DRAMA", director: "Taylor Sheridan", difficulty: 78, studioId: "PARAMOUNT", prestige: 86, description: '', type: 'SERIES' },
    { title: "Dexter", genre: "THRILLER", director: "James Manos Jr.", difficulty: 82, studioId: "PARAMOUNT", prestige: 86, description: '', type: 'SERIES' },
    { title: "Halo", genre: "SCI_FI", director: "Kyle Killen", difficulty: 76, studioId: "PARAMOUNT", prestige: 78, description: '', type: 'SERIES' },
    { title: "The Bear", genre: "DRAMA", director: "Christopher Storer", difficulty: 82, studioId: "HULU", prestige: 92, description: '', type: 'SERIES' },
    { title: "Wednesday", genre: "FANTASY", director: "Tim Burton", difficulty: 76, studioId: "NETFLIX", prestige: 84, description: '', type: 'SERIES' },
    { title: "The Crown", genre: "DRAMA", director: "Peter Morgan", difficulty: 86, studioId: "NETFLIX", prestige: 92, description: '', type: 'SERIES' },
    { title: "Narcos", genre: "CRIME", director: "Chris Brancato", difficulty: 82, studioId: "NETFLIX", prestige: 88, description: '', type: 'SERIES' },
    { title: "Peaky Blinders", genre: "CRIME", director: "Steven Knight", difficulty: 84, studioId: "NETFLIX", prestige: 90, description: '', type: 'SERIES' },
    { title: "Better Call Saul", genre: "CRIME", director: "Vince Gilligan", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 96, description: '', type: 'SERIES' },
    { title: "Fargo", genre: "CRIME", director: "Noah Hawley", difficulty: 86, studioId: "ARTISAN_PICTURES", prestige: 91, description: '', type: 'SERIES' },
    { title: "Westworld", genre: "SCI_FI", director: "Jonathan Nolan", difficulty: 88, studioId: "HBO", prestige: 88, description: '', type: 'SERIES' },
    { title: "Andor", genre: "SCI_FI", director: "Tony Gilroy", difficulty: 86, studioId: "LUCASFILM", prestige: 90, description: '', type: 'SERIES' },
    { title: "Loki", genre: "SUPERHERO", director: "Michael Waldron", difficulty: 78, studioId: "DISNEY_PLUS", prestige: 84, description: '', type: 'SERIES' },
    { title: "WandaVision", genre: "SUPERHERO", director: "Jac Schaeffer", difficulty: 82, studioId: "DISNEY_PLUS", prestige: 86, description: '', type: 'SERIES' },
    { title: "The Boys", genre: "SUPERHERO", director: "Eric Kripke", difficulty: 84, studioId: "ARTISAN_PICTURES", prestige: 86, description: '', type: 'SERIES' },
    { title: "Mr. Robot", genre: "THRILLER", director: "Sam Esmail", difficulty: 88, studioId: "UNIVERSAL", prestige: 92, description: '', type: 'SERIES' },
    { title: "Fleabag", genre: "COMEDY", director: "Phoebe Waller-Bridge", difficulty: 84, studioId: "ARTISAN_PICTURES", prestige: 94, description: '', type: 'SERIES' },
    { title: "Abbott Elementary", genre: "COMEDY", director: "Quinta Brunson", difficulty: 68, studioId: "DISNEY_PLUS", prestige: 84, description: '', type: 'SERIES' },
    { title: "Modern Family", genre: "COMEDY", director: "Christopher Lloyd", difficulty: 68, studioId: "DISNEY_PLUS", prestige: 86, description: '', type: 'SERIES' },
    { title: "The X-Files", genre: "MYSTERY", director: "Chris Carter", difficulty: 80, studioId: "SONY_PICTURES", prestige: 88, description: '', type: 'SERIES' },
    { title: "The West Wing", genre: "DRAMA", director: "Aaron Sorkin", difficulty: 86, studioId: "WARNER_BROS", prestige: 92, description: '', type: 'SERIES' },
    { title: "The Marvelous Mrs. Maisel", genre: "COMEDY", director: "Amy Sherman-Palladino", difficulty: 78, studioId: "AMAZON_STUDIOS", prestige: 90, description: '', type: 'SERIES' },
    { title: "The Queen's Gambit", genre: "DRAMA", director: "Scott Frank", difficulty: 82, studioId: "NETFLIX", prestige: 92, description: '', type: 'SERIES' },
    { title: "Squid Game", genre: "THRILLER", director: "Hwang Dong-hyuk", difficulty: 86, studioId: "NETFLIX", prestige: 91, description: '', type: 'SERIES' },
    { title: "Mindhunter", genre: "CRIME", director: "David Fincher", difficulty: 86, studioId: "NETFLIX", prestige: 90, description: '', type: 'SERIES' },
    { title: "The Witcher", genre: "FANTASY", director: "Lauren Schmidt Hissrich", difficulty: 80, studioId: "NETFLIX", prestige: 82, description: '', type: 'SERIES' }
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- HELPERS ---
const getFamousProjectLocaleId = (def: FamousProjectDef) => (
    def.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
);

export const getFamousProjectDescription = (language: GameLanguage, def: FamousProjectDef) => (
    (() => {
        const descriptionKey = `services.famousProject.description.${getFamousProjectLocaleId(def)}`;
        const description = t(language, `services.famousProject.description.${getFamousProjectLocaleId(def)}`);
        return description === descriptionKey
            ? t(language, def.type === 'SERIES' ? 'services.famousProject.description.generic.series' : 'services.famousProject.description.generic.movie', { title: def.title })
            : description;
    })()
);

export const getNextFamousMovie = (player: Player): FamousProjectDef | null => {
    // Filter out movies already released in this world run
    const available = FAMOUS_MOVIE_DB.filter(m => !player.world.famousMoviesReleased?.includes(m.title));
    return pick(available.length > 0 ? available : FAMOUS_MOVIE_DB);
};

export const getNextFamousSeries = (player: Player): FamousProjectDef | null => {
    // Filter out series already released
    const available = FAMOUS_SERIES_DB.filter(m => !player.world.famousMoviesReleased?.includes(m.title));
    return pick(available.length > 0 ? available : FAMOUS_SERIES_DB);
};

export const createFamousOpportunity = (def: FamousProjectDef, roleType: RoleType, source: 'CASTING_APP' | 'AGENT' | 'DIRECT', language: GameLanguage = 'en'): AuditionOpportunity => {
    // Generate Stats
    const hidden: ProjectHiddenStats = {
        scriptQuality: Math.min(100, def.prestige + Math.random() * 5),
        directorQuality: Math.min(100, def.prestige + Math.random() * 5),
        castingStrength: 90 + Math.random() * 10,
        distributionPower: 90 + Math.random() * 10,
        rawHype: 80 + Math.random() * 20,
        qualityScore: def.prestige, // High base quality
        prestigeBonus: 5
    };

    const isTV = def.type === 'SERIES';
    const estimatedBudget = isTV 
        ? 5000000 + Math.random() * 10000000 // Per episode budget roughly
        : 100000000 + Math.random() * 50000000;

    const details: ProjectDetails = {
        title: def.title,
        type: def.type,
        description: getFamousProjectDescription(language, def),
        studioId: def.studioId,
        subtype: 'STANDALONE', // Could be series starter
        genre: def.genre,
        budgetTier: 'HIGH',
        estimatedBudget,
        releaseScale: 'GLOBAL',
        releaseStrategy: isTV ? 'STREAMING_ONLY' : 'THEATRICAL',
        visibleHype: 'HIGH',
        hiddenStats: hidden,
        directorName: def.director,
        visibleDirectorTier: t(language, 'services.famousProject.visible.director.legend'),
        visibleScriptBuzz: t(language, 'services.famousProject.visible.script.masterpiece'),
        visibleCastStrength: t(language, 'services.famousProject.visible.cast.iconic'),
        isFamous: true // MARKER
    };

    const config = ROLE_DEFINITIONS[roleType];
    
    // Pay is standard for role, higher for movies, but TV has potential recurring
    // For simplicity, we give a huge lump sum for the "Season" or "Film"
    const pay = config.baseIncome * (isTV ? 15 : 20); 

    return {
        id: `famous_${source.toLowerCase()}_${Date.now()}`,
        roleType,
        projectName: def.title,
        genre: def.genre,
        config: { 
            ...config, 
            difficulty: def.difficulty, // Override with specific difficulty
            label: t(language, roleType === 'LEAD' ? 'services.famousProject.role.lead' : 'services.famousProject.role.role')
        },
        project: details,
        estimatedIncome: pay,
        source: source,
        royaltyPercentage: isTV ? 1.5 : 2.5 // TV residuals vs Movie points
    };
};

// --- GENERATORS ---

// 1. Hard Audition Path (Standard appearance in CastLink)
export const generateFamousMovieOpportunity = (player: Player): AuditionOpportunity | null => {
    const movie = getNextFamousMovie(player);
    if (!movie) return null;

    // Famous movies usually audition for Supporting or Lead
    const roleType: RoleType = Math.random() > 0.7 ? 'LEAD' : 'SUPPORTING';
    
    return createFamousOpportunity(movie, roleType, 'CASTING_APP', getPlayerLanguage(player));
};

// 2. TV Series Path
export const generateFamousSeriesOpportunity = (player: Player): AuditionOpportunity | null => {
    const series = getNextFamousSeries(player);
    if (!series) return null;

    // Series usually audition for Lead or Ensemble
    const roleType: RoleType = Math.random() > 0.5 ? 'LEAD' : 'ENSEMBLE';
    
    return createFamousOpportunity(series, roleType, 'CASTING_APP', getPlayerLanguage(player));
};

// 3. Cameo Break Path (Direct Invite via Message)
export const generateCameoOffer = (player: Player): { opportunity: AuditionOpportunity, messageText: string } | null => {
    // Trigger Conditions: Rising Star status
    if (player.stats.fame < 20 || player.stats.fame > 70) return null; // "Rising" window
    if (player.stats.reputation < 30) return null; // Need some respect

    const project = Math.random() > 0.5 ? getNextFamousMovie(player) : getNextFamousSeries(player);
    if (!project) return null;

    const language = getPlayerLanguage(player);
    const opp = createFamousOpportunity(project, 'CAMEO', 'DIRECT', language);
    
    // Adjust cameo specific income
    opp.estimatedIncome = 15000; 
    opp.config = { ...opp.config, label: t(language, 'services.famousProject.role.cameo'), difficulty: 20, energyCost: 10, expGain: 20 };

    const messageText = t(language, 'services.famousProject.cameo.message', {
        director: project.director,
        title: project.title
    });

    return { opportunity: opp, messageText };
};
