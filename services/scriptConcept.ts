import type { Genre, ProjectFormat, ScriptAttributes, ScriptOption, ScriptSubjectType } from '../types';
import { SCRIPT_TEMPLATES, type ScriptChoiceCompass } from '../src/data/scriptTemplates';

const clampScriptStat = (value: number) => Math.max(10, Math.min(100, Math.round(value)));

// Resolve by genre AND question: several genres have a question called "setting".
const selectedChoices = (genre: Genre, options: ScriptOption[]) => (SCRIPT_TEMPLATES[genre] || []).flatMap(question => {
    const selected = options.find(option => option.questionId === question.id);
    const choice = question.options.find(option => option.id === selected?.choiceId);
    return choice ? [choice] : [];
});

const variationKeys = new Set(Object.values(SCRIPT_TEMPLATES).flatMap(questions => questions.flatMap(question =>
    question.options.filter(choice => choice.dna).map(choice => `${question.id}:${choice.id}`))));

/** Unknown legacy tokens remain readable; new variation IDs belong to their genre/question. */
export const getScriptChoiceTokens = (genre: Genre | undefined, options: ScriptOption[]): string[] => options.flatMap(option => {
    if (variationKeys.has(`${option.questionId}:${option.choiceId}`)
        && !SCRIPT_TEMPLATES[genre]?.some(question => question.id === option.questionId && question.options.some(choice => choice.id === option.choiceId))) return [];
    return [option.questionId, option.choiceId];
});

/** A deterministic pitch from the chosen answers; custom player text stays in the wizard. */
export const suggestScriptPremise = (genres: Genre[], options: ScriptOption[], fallback: string, subjectName?: string): string => {
    if (!genres[0]) return fallback;
    const choices = selectedChoices(genres[0], options);
    if (!choices.length) return fallback;
    const ordered = [...choices.filter(choice => choice.premise), ...choices.filter(choice => !choice.premise)];
    const label = genres.map(genre => genre.replaceAll('_', '-').toLowerCase()).join('/');
    const subject = subjectName?.trim();
    const prefix = subject ? `${genres[0] === 'BIOPIC' ? 'A portrait of' : 'An investigation into'} ${subject}` : `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
    const pitch = `${prefix}: ${ordered.map(choice => choice.premise || choice.text).join('; ')}.`;
    if (pitch.length <= 180) return pitch;
    const shortened = pitch.slice(0, 179);
    return `${shortened.slice(0, shortened.lastIndexOf(' ')).replace(/[;,.]$/, '')}…`;
};

export const getScriptChoiceCompass = (genre: Genre, options: ScriptOption[]): ScriptChoiceCompass => {
    const choices = selectedChoices(genre, options);
    const compass = Object.assign({}, ...choices.map(choice => choice.compass || {})) as ScriptChoiceCompass;
    const worlds = new Set(choices.map(choice => choice.compass?.worldRule).filter(Boolean));
    if (worlds.size > 1) compass.worldRule = 'MIXED';
    return compass;
};

export const calculateConceptAttributes = (
    genre: Genre,
    format: ProjectFormat,
    subjectType: ScriptSubjectType,
    selectedOptions: { questionId: string; choiceId: string }[],
    hasSecondaryGenre: boolean
): ScriptAttributes => {
    const attrs: ScriptAttributes = { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };
    const boost = (stat: keyof ScriptAttributes, amount: number) => {
        attrs[stat] = clampScriptStat((attrs[stat] || 50) + amount);
    };

    if (hasSecondaryGenre) boost('originality', 4);
    if (format === 'ANIMATED') {
        boost('originality', 8);
        boost('characters', 5);
        if (genre === 'ANIMATION' || genre === 'FANTASY') boost('action', 5);
    }
    if (format === 'ANIME') {
        boost('originality', 10);
        boost('action', 7);
        boost('pacing', 4);
    }
    if (genre === 'BIOPIC') {
        boost('characters', 10);
        boost('dialogue', 4);
        boost('originality', subjectType === 'ATHLETE' || subjectType === 'MUSICIAN' ? 5 : 2);
    }
    if (genre === 'DOCUMENTARY') {
        boost('originality', 12);
        boost('plot', 6);
        boost('dialogue', 3);
        boost('action', -8);
    }
    if (genre === 'MUSICAL') {
        boost('originality', 8);
        boost('dialogue', 5);
        boost('pacing', 5);
    }
    if (genre === 'SPORTS') {
        boost('action', 8);
        boost('pacing', 6);
        boost('characters', 4);
    }
    if (genre === 'CRIME') {
        boost('plot', 8);
        boost('pacing', 5);
    }
    if (genre === 'MYSTERY') {
        boost('plot', 10);
        boost('originality', 4);
        boost('pacing', 3);
        boost('dialogue', 2);
    }
    if (genre === 'FANTASY') {
        boost('plot', 8);
        boost('originality', 7);
    }

    const appliedNewQuestions = new Set<string>();
    selectedOptions.forEach(option => {
        const choice = SCRIPT_TEMPLATES[genre]?.find(question => question.id === option.questionId)?.options.find(choice => choice.id === option.choiceId);
        if (choice?.dna) {
            if (appliedNewQuestions.has(option.questionId)) return;
            appliedNewQuestions.add(option.questionId);
            for (const [stat, amount] of Object.entries(choice.dna)) boost(stat as keyof ScriptAttributes, amount);
            return;
        }
        if (variationKeys.has(`${option.questionId}:${option.choiceId}`)) return;
        // Legacy choices retain their exact scoring; no save migration or re-roll.
        const id = option.choiceId;
        if (/archive|exclusive|original|forbidden|lost-heir|world|mature|stylized|messy/.test(id)) boost('originality', 5);
        if (/authorized|private|intimate|character|slice|family|community|mob/.test(id)) boost('characters', 5);
        if (/investigative|detective|mystery|case|truth|open-question/.test(id)) boost('plot', 5);
        if (/shonen|rivalry|final|breakneck|sports|action|monster/.test(id)) boost('action', 5);
        if (/jukebox|voice|comedy|dialogue|interviews|witnesses/.test(id)) boost('dialogue', 5);
        if (/comeback|underdog|cultural|backstage|fame|dark-fantasy/.test(id)) boost('pacing', 4);
    });

    return attrs;
};

export const calculateConceptQuality = (attrs: ScriptAttributes) => {
    const weighted = ((attrs.plot || 50) * 1.2) + ((attrs.characters || 50) * 1.1) + (attrs.pacing || 50) + (attrs.dialogue || 50) + ((attrs.action || 50) * 0.85) + ((attrs.originality || 50) * 1.1);
    return clampScriptStat(weighted / 6.25);
};

