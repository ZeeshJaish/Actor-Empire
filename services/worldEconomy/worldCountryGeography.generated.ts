/* ============================================================================
   COUNTRY GEOGRAPHY — where each country is, and which shape on the map is it.

   GENERATED. Do not edit by hand.
   Run `npm run generate:country-geography` to rebuild from the shared atlas.

   Each entry is [atlas shape id, latitude, longitude]. A null shape id means
   the country is too small to appear in countries-50m; it still has a position,
   so the reach model can serve it, but the map has nothing to paint.

   The position is the centroid of the country's largest landmass — geometric,
   not population-weighted. Close enough to measure a server's reach against,
   and a great deal closer than the previous answer, which placed 31 countries
   on Mumbai and 26 on Lagos because it had no better one.
   ========================================================================== */

/** [atlas shape id | null, latitude, longitude] */
export type CountryGeography = readonly [string | null, number, number];

export const COUNTRY_GEOGRAPHY: Record<string, CountryGeography> = {
  AG: ['028', 17.08, -61.79], // Antigua and Barbuda
  BS: ['044', 24.70, -78.04], // Bahamas
  BB: ['052', 13.18, -59.56], // Barbados
  BZ: ['084', 17.19, -88.72], // Belize
  CA: ['124', 44.50, -78.00], // Canada
  CR: ['188', 9.98, -84.19], // Costa Rica
  CU: ['192', 21.63, -78.91], // Cuba
  DM: ['212', 15.44, -61.36], // Dominica
  DO: ['214', 18.90, -70.51], // Dominican Republic
  SV: ['222', 13.74, -88.87], // El Salvador
  GD: ['308', 12.12, -61.68], // Grenada
  GT: ['320', 15.69, -90.37], // Guatemala
  HT: ['332', 18.93, -72.68], // Haiti
  HN: ['340', 14.83, -86.62], // Honduras
  JM: ['388', 18.16, -77.31], // Jamaica
  MX: ['484', 19.80, -99.50], // Mexico
  NI: ['558', 12.85, -85.03], // Nicaragua
  PA: ['591', 8.53, -80.11], // Panama
  KN: ['659', 17.33, -62.75], // Saint Kitts and Nevis
  LC: ['662', 13.89, -60.97], // Saint Lucia
  VC: [null, 13.25, -61.20], // Saint Vincent and the Grenadines — no shape in the atlas
  TT: ['780', 10.42, -61.29], // Trinidad and Tobago
  US: ['840', 38.50, -92.00], // United States
  AR: ['032', -34.00, -59.50], // Argentina
  BO: ['068', -16.68, -64.70], // Bolivia
  BR: ['076', -20.50, -44.50], // Brazil
  CL: ['152', -33.50, -70.70], // Chile
  CO: ['170', 4.70, -74.10], // Colombia
  EC: ['218', -1.44, -78.39], // Ecuador
  GY: ['328', 4.79, -58.98], // Guyana
  PY: ['600', -23.21, -58.44], // Paraguay
  PE: ['604', -12.00, -77.00], // Peru
  SR: ['740', 4.13, -55.91], // Suriname
  UY: ['858', -32.79, -56.03], // Uruguay
  VE: ['862', 10.20, -67.50], // Venezuela
  AL: ['008', 41.13, 20.05], // Albania
  AD: ['020', 42.54, 1.56], // Andorra
  AT: ['040', 47.59, 14.11], // Austria
  BY: ['112', 53.52, 28.02], // Belarus
  BE: ['056', 50.64, 4.65], // Belgium
  BA: ['070', 44.17, 17.77], // Bosnia and Herzegovina
  BG: ['100', 42.77, 25.21], // Bulgaria
  HR: ['191', 45.16, 16.42], // Croatia
  CY: ['196', 34.92, 33.01], // Cyprus
  CZ: ['203', 49.74, 15.32], // Czechia
  DK: ['208', 56.23, 9.35], // Denmark
  EE: ['233', 58.68, 25.84], // Estonia
  FI: ['246', 60.50, 24.50], // Finland
  FR: ['250', 46.57, 2.46], // France
  DE: ['276', 51.03, 10.35], // Germany
  GR: ['300', 39.46, 22.57], // Greece
  HU: ['348', 47.17, 19.38], // Hungary
  IS: ['352', 65.00, -18.58], // Iceland
  IE: ['372', 53.16, -8.14], // Ireland
  IT: ['380', 43.49, 12.30], // Italy
  XK: [null, 42.60, 20.90], // Kosovo — no shape in the atlas
  LV: ['428', 56.86, 24.92], // Latvia
  LI: ['438', 47.14, 9.54], // Liechtenstein
  LT: ['440', 55.32, 23.90], // Lithuania
  LU: ['442', 49.77, 6.07], // Luxembourg
  MT: ['470', 35.89, 14.44], // Malta
  MD: ['498', 47.19, 28.47], // Moldova
  MC: ['492', 43.75, 7.41], // Monaco
  ME: ['499', 42.79, 19.24], // Montenegro
  NL: ['528', 52.28, 5.63], // Netherlands
  MK: ['807', 41.60, 21.68], // North Macedonia
  NO: ['578', 60.00, 10.80], // Norway
  PL: ['616', 52.11, 19.42], // Poland
  PT: ['620', 39.65, -7.98], // Portugal
  RO: ['642', 45.85, 24.98], // Romania
  RU: ['643', 55.75, 37.62], // Russia
  SM: ['674', 43.94, 12.46], // San Marino
  RS: ['688', 44.21, 20.81], // Serbia
  SK: ['703', 48.71, 19.47], // Slovakia
  SI: ['705', 46.12, 14.80], // Slovenia
  ES: ['724', 40.37, -3.57], // Spain
  SE: ['752', 59.00, 17.00], // Sweden
  CH: ['756', 46.80, 8.21], // Switzerland
  UA: ['804', 49.20, 31.32], // Ukraine
  GB: ['826', 53.83, -2.41], // United Kingdom
  VA: ['336', 41.90, 12.43], // Vatican City
  DZ: ['012', 36.40, 3.30], // Algeria
  AO: ['024', -12.31, 17.56], // Angola
  BJ: ['204', 9.64, 2.33], // Benin
  BW: ['072', -22.17, 23.81], // Botswana
  BF: ['854', 12.27, -1.76], // Burkina Faso
  BI: ['108', -3.36, 29.88], // Burundi
  CV: ['132', 15.08, -23.64], // Cabo Verde
  CM: ['120', 5.68, 12.73], // Cameroon
  CF: ['140', 6.57, 20.46], // Central African Republic
  TD: ['148', 12.50, 15.00], // Chad
  KM: ['174', -11.65, 43.34], // Comoros
  CD: ['180', -4.60, 17.00], // DR Congo
  CG: ['178', -0.84, 15.22], // Republic of the Congo
  CI: ['384', 7.63, -5.57], // Côte d’Ivoire
  DJ: ['262', 11.75, 42.56], // Djibouti
  EG: ['818', 30.00, 31.20], // Egypt
  GQ: ['226', 1.57, 10.47], // Equatorial Guinea
  ER: ['232', 15.36, 38.85], // Eritrea
  SZ: ['748', -26.56, 31.48], // Eswatini
  ET: ['231', 8.61, 39.61], // Ethiopia
  GA: ['266', -0.59, 11.79], // Gabon
  GM: ['270', 13.45, -15.40], // Gambia
  GH: ['288', 7.95, -1.22], // Ghana
  GN: ['324', 10.44, -10.93], // Guinea
  GW: ['624', 12.06, -14.92], // Guinea-Bissau
  KE: ['404', 0.60, 37.80], // Kenya
  LS: ['426', -29.58, 28.23], // Lesotho
  LR: ['430', 6.45, -9.32], // Liberia
  LY: ['434', 32.50, 14.50], // Libya
  MG: ['450', -19.32, 46.74], // Madagascar
  MW: ['454', -13.21, 34.28], // Malawi
  ML: ['466', 13.50, -7.50], // Mali
  MR: ['478', 18.10, -15.90], // Mauritania
  MU: ['480', -20.28, 57.57], // Mauritius
  MA: ['504', 29.77, -8.73], // Morocco
  MZ: ['508', -17.20, 35.60], // Mozambique
  NA: ['516', -22.07, 17.20], // Namibia
  NE: ['562', 13.60, 5.00], // Niger
  NG: ['566', 9.59, 8.08], // Nigeria
  RW: ['646', -1.99, 29.92], // Rwanda
  ST: ['678', 0.24, 6.61], // São Tomé and Príncipe
  SN: ['686', 14.36, -14.47], // Senegal
  SC: ['690', -4.66, 55.48], // Seychelles
  SL: ['694', 8.57, -11.79], // Sierra Leone
  SO: ['706', 4.74, 45.68], // Somalia
  ZA: ['710', -26.20, 28.00], // South Africa
  SS: ['728', 7.31, 30.25], // South Sudan
  SD: ['729', 15.50, 32.50], // Sudan
  TZ: ['834', -6.27, 34.79], // Tanzania
  TG: ['768', 8.52, 0.96], // Togo
  TN: ['788', 34.09, 9.55], // Tunisia
  UG: ['800', 1.27, 32.37], // Uganda
  ZM: ['894', -13.46, 27.81], // Zambia
  ZW: ['716', -19.00, 29.85], // Zimbabwe
  AF: ['004', 33.82, 65.93], // Afghanistan
  AM: ['051', 40.29, 44.94], // Armenia
  AZ: ['031', 40.34, 47.67], // Azerbaijan
  BH: ['048', 26.04, 50.54], // Bahrain
  BD: ['050', 23.89, 90.23], // Bangladesh
  BT: ['064', 27.41, 90.40], // Bhutan
  BN: ['096', 4.49, 114.59], // Brunei
  KH: ['116', 12.72, 104.91], // Cambodia
  CN: ['156', 34.50, 113.50], // China
  GE: ['268', 42.17, 43.52], // Georgia
  IN: ['356', 24.50, 79.50], // India
  ID: ['360', -7.00, 110.00], // Indonesia
  IR: ['364', 35.70, 51.40], // Iran
  IQ: ['368', 33.01, 43.77], // Iraq
  IL: ['376', 31.90, 35.00], // Israel
  JP: ['392', 36.63, 137.88], // Japan
  JO: ['400', 31.24, 36.76], // Jordan
  KZ: ['398', 43.80, 73.00], // Kazakhstan
  KW: ['414', 29.32, 47.56], // Kuwait
  KG: ['417', 41.47, 74.51], // Kyrgyzstan
  LA: ['418', 18.49, 103.78], // Laos
  LB: ['422', 33.92, 35.88], // Lebanon
  MY: ['458', 3.62, 114.72], // Malaysia
  MV: ['462', 4.20, 73.50], // Maldives
  MN: ['496', 47.90, 106.90], // Mongolia
  MM: ['104', 17.50, 96.50], // Myanmar
  NP: ['524', 28.26, 83.95], // Nepal
  KP: ['408', 40.14, 127.16], // North Korea
  OM: ['512', 23.60, 58.40], // Oman
  PK: ['586', 30.50, 72.50], // Pakistan
  PS: ['275', 31.95, 35.25], // Palestine
  PH: ['608', 15.95, 121.42], // Philippines
  QA: ['634', 25.30, 51.18], // Qatar
  SA: ['682', 24.70, 46.70], // Saudi Arabia
  SG: ['702', 1.36, 103.82], // Singapore
  KR: ['410', 36.45, 127.87], // South Korea
  LK: ['144', 7.61, 80.70], // Sri Lanka
  SY: ['760', 35.02, 38.49], // Syria
  TW: ['158', 23.75, 120.96], // Taiwan
  TJ: ['762', 38.53, 71.03], // Tajikistan
  TH: ['764', 15.10, 101.00], // Thailand
  TL: ['626', -8.81, 125.92], // Timor-Leste
  TR: ['792', 39.90, 32.90], // Türkiye
  TM: ['795', 39.13, 59.45], // Turkmenistan
  AE: ['784', 23.90, 54.30], // United Arab Emirates
  UZ: ['860', 41.78, 63.29], // Uzbekistan
  VN: ['704', 18.00, 105.80], // Vietnam
  YE: ['887', 15.94, 47.52], // Yemen
  AU: ['036', -33.00, 148.50], // Australia
  FJ: ['242', -17.82, 177.97], // Fiji
  KI: ['296', 1.85, -157.37], // Kiribati
  MH: ['584', 7.11, 171.19], // Marshall Islands
  FM: ['583', 6.89, 158.23], // Micronesia
  NR: ['520', -0.52, 166.93], // Nauru
  NZ: ['554', -37.00, 175.00], // New Zealand
  PW: ['585', 7.51, 134.58], // Palau
  PG: ['598', -6.60, 144.23], // Papua New Guinea
  WS: ['882', -13.63, -172.44], // Samoa
  SB: ['090', -9.62, 160.17], // Solomon Islands
  TO: ['776', -21.17, -175.22], // Tonga
  TV: [null, -7.11, 179.19], // Tuvalu — no shape in the atlas
  VU: ['548', -15.23, 166.85], // Vanuatu
};
