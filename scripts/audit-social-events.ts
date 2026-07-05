import { getFlavorTexts, getSocialEvents, SOCIAL_EVENTS_DB } from '../services/socialEvents';

const languages = ['en', 'pt-BR'] as const;
const categories = ['DATE', 'CLUBBING', 'HANGOUT'] as const;

let checks = 0;

for (const language of languages) {
    for (const category of categories) {
        const events = getSocialEvents(language, category);
        if (events.length === 0) {
            throw new Error(`${language}/${category} should expose social events.`);
        }

        events.forEach((event, eventIndex) => {
            if (!event.title || event.title.startsWith('services.socialEvents.')) {
                throw new Error(`${language}/${category}/${eventIndex} missing localized title.`);
            }
            if (!event.desc || event.desc.startsWith('services.socialEvents.')) {
                throw new Error(`${language}/${category}/${eventIndex} missing localized description.`);
            }
            if (!Array.isArray(event.options) || event.options.length === 0) {
                throw new Error(`${language}/${category}/${eventIndex} missing options.`);
            }

            event.options.forEach((option, optionIndex) => {
                if (!option.label || option.label.startsWith('services.socialEvents.')) {
                    throw new Error(`${language}/${category}/${eventIndex}/${optionIndex} missing localized label.`);
                }
                if (!option.logMessage || option.logMessage.startsWith('services.socialEvents.')) {
                    throw new Error(`${language}/${category}/${eventIndex}/${optionIndex} missing localized log.`);
                }
                if (!option.impact || typeof option.impact !== 'object') {
                    throw new Error(`${language}/${category}/${eventIndex}/${optionIndex} missing impact.`);
                }
                checks += 1;
            });
        });

        const flavors = getFlavorTexts(language, category);
        if (flavors.length < 5 || flavors.some(text => !text || text.startsWith('services.socialEvents.'))) {
            throw new Error(`${language}/${category} has missing localized flavor text.`);
        }
        checks += flavors.length;
    }
}

if (SOCIAL_EVENTS_DB.DATE?.[0]?.title !== getSocialEvents('en', 'DATE')[0]?.title) {
    throw new Error('English compatibility social event DB is out of sync.');
}

console.log(`Social events audit passed with ${checks} checks.`);
