import type { WorldCountryDevelopmentProfile, WorldPopulationRegionId } from '../../types';

export const WORLD_POPULATION_BASELINE = 8_120_000_000;

export interface WorldCountryDefinition {
    id: string;
    name: string;
    regionId: WorldPopulationRegionId;
    baselinePopulation: number;
    developmentProfile: WorldCountryDevelopmentProfile;
    languages: string[];
}

interface RawCountryDefinition {
    id: string;
    name: string;
    regionId: WorldPopulationRegionId;
    populationMillions: number;
    languages: string[];
}

const rows = (regionId: WorldPopulationRegionId, source: string): RawCountryDefinition[] => source
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
        const [id, name, populationMillions, languageList] = line.split('|');
        return {
            id,
            name,
            regionId,
            populationMillions: Number(populationMillions),
            languages: languageList.split(',').map(language => language.trim()).filter(Boolean),
        };
    });

const RAW_COUNTRIES: RawCountryDefinition[] = [
    ...rows('NORTH_AMERICA', `
AG|Antigua and Barbuda|0.10|English
BS|Bahamas|0.41|English
BB|Barbados|0.28|English
BZ|Belize|0.42|English,Spanish
CA|Canada|41.0|English,French
CR|Costa Rica|5.2|Spanish
CU|Cuba|11.0|Spanish
DM|Dominica|0.07|English
DO|Dominican Republic|11.5|Spanish
SV|El Salvador|6.4|Spanish
GD|Grenada|0.13|English
GT|Guatemala|18.4|Spanish
HT|Haiti|11.9|Haitian Creole,French
HN|Honduras|10.8|Spanish
JM|Jamaica|2.8|English
MX|Mexico|131.0|Spanish
NI|Nicaragua|7.0|Spanish
PA|Panama|4.5|Spanish
KN|Saint Kitts and Nevis|0.05|English
LC|Saint Lucia|0.18|English
VC|Saint Vincent and the Grenadines|0.10|English
TT|Trinidad and Tobago|1.5|English
US|United States|342.0|English,Spanish
`),
    ...rows('SOUTH_AMERICA', `
AR|Argentina|46.0|Spanish
BO|Bolivia|12.5|Spanish,Quechua
BR|Brazil|218.0|Portuguese
CL|Chile|20.0|Spanish
CO|Colombia|53.0|Spanish
EC|Ecuador|18.5|Spanish
GY|Guyana|0.84|English
PY|Paraguay|7.0|Spanish,Guaraní
PE|Peru|34.5|Spanish,Quechua
SR|Suriname|0.64|Dutch
UY|Uruguay|3.4|Spanish
VE|Venezuela|29.0|Spanish
`),
    ...rows('EUROPE', `
AL|Albania|2.8|Albanian
AD|Andorra|0.08|Catalan
AT|Austria|9.2|German
BY|Belarus|9.1|Belarusian,Russian
BE|Belgium|11.8|Dutch,French,German
BA|Bosnia and Herzegovina|3.2|Bosnian,Croatian,Serbian
BG|Bulgaria|6.7|Bulgarian
HR|Croatia|3.9|Croatian
CY|Cyprus|1.3|Greek,Turkish
CZ|Czechia|10.9|Czech
DK|Denmark|6.0|Danish
EE|Estonia|1.4|Estonian
FI|Finland|5.6|Finnish,Swedish
FR|France|66.5|French
DE|Germany|84.5|German
GR|Greece|10.3|Greek
HU|Hungary|9.6|Hungarian
IS|Iceland|0.40|Icelandic
IE|Ireland|5.4|English,Irish
IT|Italy|59.0|Italian
XK|Kosovo|1.8|Albanian,Serbian
LV|Latvia|1.9|Latvian
LI|Liechtenstein|0.04|German
LT|Lithuania|2.9|Lithuanian
LU|Luxembourg|0.68|Luxembourgish,French,German
MT|Malta|0.55|Maltese,English
MD|Moldova|3.0|Romanian
MC|Monaco|0.04|French
ME|Montenegro|0.63|Montenegrin
NL|Netherlands|18.0|Dutch
MK|North Macedonia|1.8|Macedonian,Albanian
NO|Norway|5.6|Norwegian
PL|Poland|38.5|Polish
PT|Portugal|10.4|Portuguese
RO|Romania|19.0|Romanian
RU|Russia|144.0|Russian
SM|San Marino|0.03|Italian
RS|Serbia|6.7|Serbian
SK|Slovakia|5.4|Slovak
SI|Slovenia|2.1|Slovenian
ES|Spain|49.0|Spanish,Catalan
SE|Sweden|10.6|Swedish
CH|Switzerland|9.0|German,French,Italian
UA|Ukraine|37.0|Ukrainian
GB|United Kingdom|69.0|English
VA|Vatican City|0.001|Italian,Latin
`),
    ...rows('AFRICA', `
DZ|Algeria|47.0|Arabic,Berber
AO|Angola|38.0|Portuguese
BJ|Benin|14.5|French
BW|Botswana|2.7|English,Tswana
BF|Burkina Faso|24.0|French
BI|Burundi|14.0|Kirundi,French
CV|Cabo Verde|0.53|Portuguese
CM|Cameroon|29.5|French,English
CF|Central African Republic|5.5|French,Sango
TD|Chad|20.0|French,Arabic
KM|Comoros|0.88|Comorian,French,Arabic
CD|DR Congo|109.0|French
CG|Republic of the Congo|6.4|French
CI|Côte d’Ivoire|31.5|French
DJ|Djibouti|1.2|Arabic,French
EG|Egypt|116.0|Arabic
GQ|Equatorial Guinea|1.9|Spanish,French
ER|Eritrea|3.6|Tigrinya,Arabic
SZ|Eswatini|1.2|Swazi,English
ET|Ethiopia|132.0|Amharic
GA|Gabon|2.5|French
GM|Gambia|2.8|English
GH|Ghana|35.0|English
GN|Guinea|15.0|French
GW|Guinea-Bissau|2.2|Portuguese
KE|Kenya|56.5|Swahili,English
LS|Lesotho|2.3|Sesotho,English
LR|Liberia|5.6|English
LY|Libya|7.4|Arabic
MG|Madagascar|31.5|Malagasy,French
MW|Malawi|21.5|English,Chichewa
ML|Mali|25.0|French
MR|Mauritania|5.1|Arabic
MU|Mauritius|1.3|English,French
MA|Morocco|38.0|Arabic,Berber
MZ|Mozambique|35.0|Portuguese
NA|Namibia|3.0|English
NE|Niger|28.0|French
NG|Nigeria|232.0|English,Hausa,Yoruba,Igbo
RW|Rwanda|14.5|Kinyarwanda,English,French
ST|São Tomé and Príncipe|0.24|Portuguese
SN|Senegal|19.0|French
SC|Seychelles|0.13|Seychellois Creole,English,French
SL|Sierra Leone|8.9|English
SO|Somalia|19.0|Somali,Arabic
ZA|South Africa|64.0|English,Zulu,Afrikaans
SS|South Sudan|12.0|English
SD|Sudan|51.0|Arabic,English
TZ|Tanzania|69.0|Swahili,English
TG|Togo|9.5|French
TN|Tunisia|12.4|Arabic,French
UG|Uganda|50.0|English,Swahili
ZM|Zambia|21.5|English
ZW|Zimbabwe|16.8|English,Shona,Ndebele
`),
    ...rows('ASIA', `
AF|Afghanistan|43.5|Dari,Pashto
AM|Armenia|3.0|Armenian
AZ|Azerbaijan|10.4|Azerbaijani
BH|Bahrain|1.6|Arabic
BD|Bangladesh|175.0|Bengali
BT|Bhutan|0.80|Dzongkha
BN|Brunei|0.46|Malay
KH|Cambodia|17.6|Khmer
CN|China|1410.0|Mandarin
GE|Georgia|3.7|Georgian
IN|India|1450.0|Hindi,English,Tamil,Telugu,Bengali
ID|Indonesia|284.0|Indonesian
IR|Iran|91.0|Persian
IQ|Iraq|46.0|Arabic,Kurdish
IL|Israel|9.8|Hebrew,Arabic
JP|Japan|124.0|Japanese
JO|Jordan|11.5|Arabic
KZ|Kazakhstan|20.5|Kazakh,Russian
KW|Kuwait|5.0|Arabic
KG|Kyrgyzstan|7.2|Kyrgyz,Russian
LA|Laos|7.8|Lao
LB|Lebanon|5.8|Arabic,French
MY|Malaysia|35.5|Malay,English,Mandarin,Tamil
MV|Maldives|0.53|Dhivehi
MN|Mongolia|3.5|Mongolian
MM|Myanmar|55.0|Burmese
NP|Nepal|30.0|Nepali
KP|North Korea|26.5|Korean
OM|Oman|5.3|Arabic
PK|Pakistan|252.0|Urdu,English
PS|Palestine|5.5|Arabic
PH|Philippines|116.0|Filipino,English
QA|Qatar|3.0|Arabic
SA|Saudi Arabia|35.0|Arabic
SG|Singapore|6.0|English,Mandarin,Malay,Tamil
KR|South Korea|52.0|Korean
LK|Sri Lanka|23.0|Sinhala,Tamil
SY|Syria|25.0|Arabic
TW|Taiwan|23.5|Mandarin
TJ|Tajikistan|10.7|Tajik
TH|Thailand|71.5|Thai
TL|Timor-Leste|1.4|Tetum,Portuguese
TR|Türkiye|87.0|Turkish
TM|Turkmenistan|7.5|Turkmen
AE|United Arab Emirates|11.0|Arabic,English
UZ|Uzbekistan|37.0|Uzbek
VN|Vietnam|101.0|Vietnamese
YE|Yemen|41.0|Arabic
`),
    ...rows('OCEANIA', `
AU|Australia|27.5|English
FJ|Fiji|0.94|English,Fijian,Hindi
KI|Kiribati|0.14|English,Gilbertese
MH|Marshall Islands|0.04|Marshallese,English
FM|Micronesia|0.12|English
NR|Nauru|0.013|Nauruan,English
NZ|New Zealand|5.3|English,Māori
PW|Palau|0.018|Palauan,English
PG|Papua New Guinea|10.7|English,Tok Pisin
WS|Samoa|0.23|Samoan,English
SB|Solomon Islands|0.84|English
TO|Tonga|0.11|Tongan,English
TV|Tuvalu|0.011|Tuvaluan,English
VU|Vanuatu|0.34|Bislama,English,French
`),
];

const ADVANCED_IDS = new Set([
    'AU', 'AT', 'BE', 'CA', 'DK', 'FI', 'FR', 'DE', 'IS', 'IE', 'IL', 'IT', 'JP', 'KR', 'LU', 'NL',
    'NZ', 'NO', 'SG', 'ES', 'SE', 'CH', 'GB', 'US', 'AE', 'QA', 'KW', 'BH', 'BN', 'LI', 'MC', 'SM', 'AD',
]);

const DEVELOPED_IDS = new Set([
    'AR', 'BS', 'BB', 'BW', 'BR', 'BG', 'CL', 'CN', 'CR', 'HR', 'CY', 'CZ', 'EE', 'GR', 'HU', 'KZ', 'LV',
    'LT', 'MY', 'MT', 'MU', 'MX', 'OM', 'PA', 'PL', 'PT', 'RO', 'RU', 'SA', 'SC', 'SK', 'SI', 'ZA', 'TT',
    'TR', 'UY', 'TW', 'ME', 'RS', 'MK',
]);

const LOW_IDS = new Set([
    'AF', 'BF', 'BI', 'CF', 'TD', 'CD', 'ER', 'ET', 'GM', 'GN', 'GW', 'HT', 'LR', 'MG', 'MW', 'ML',
    'MZ', 'NE', 'RW', 'SL', 'SO', 'SS', 'SD', 'TG', 'UG', 'YE',
]);

const resolveDevelopmentProfile = (id: string): WorldCountryDevelopmentProfile => {
    if (ADVANCED_IDS.has(id)) return 'ADVANCED';
    if (DEVELOPED_IDS.has(id)) return 'DEVELOPED';
    if (LOW_IDS.has(id)) return 'LOW';
    return 'EMERGING';
};

const rawTotal = RAW_COUNTRIES.reduce((sum, country) => sum + country.populationMillions, 0);
const populationScale = WORLD_POPULATION_BASELINE / Math.max(1, rawTotal * 1_000_000);
const scaledPopulations = RAW_COUNTRIES.map(country => Math.max(1, Math.round(
    country.populationMillions * 1_000_000 * populationScale,
)));
const scaledTotal = scaledPopulations.reduce((sum, population) => sum + population, 0);
scaledPopulations[scaledPopulations.length - 1] += WORLD_POPULATION_BASELINE - scaledTotal;

export const WORLD_COUNTRY_DEFINITIONS: WorldCountryDefinition[] = RAW_COUNTRIES.map((country, index) => ({
    id: country.id,
    name: country.name,
    regionId: country.regionId,
    baselinePopulation: scaledPopulations[index],
    developmentProfile: resolveDevelopmentProfile(country.id),
    languages: country.languages,
}));

export const WORLD_COUNTRY_DEFINITIONS_BY_ID: Record<string, WorldCountryDefinition> = Object.fromEntries(
    WORLD_COUNTRY_DEFINITIONS.map(country => [country.id, country]),
);
