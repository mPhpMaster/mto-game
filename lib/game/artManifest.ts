/**
 * الرسوم المُصوَّرة الموجودة فعلاً — يُولَّد هذا الملف بـ`npm run art:scan`.
 *
 * لماذا بيان مُولَّد بدل الاعتماد على وجود الملفّ: العميل لا يستطيع أن يسأل
 * «هل الصورة موجودة؟» قبل الرسم، فبدون بيانٍ مسبق يُرسَم البديل ثم يُستبدل،
 * أو يظهر مربّع مكسور. البيان يُحسم عند البناء فلا يومض شيء.
 *
 * المفتاح هوية البطاقة (`mon_<element>_<species>_<stage>`) فلكل مرحلة رسمها.
 * والمسار من `public/`، فهو صالح كما هو في `src`.
 *
 * أضف ملفّاً إلى `public/art/monsters/` وشغّل `npm run art:scan` — لا سطر كود.
 */
export const CARD_ART: Record<string, string> = {
  'mon_dark_lailks_1': '/art/monsters/mon_dark_lailks_1.webp',
  'mon_dark_lailks_2': '/art/monsters/mon_dark_lailks_2.webp',
  'mon_dark_nightmare_1': '/art/monsters/mon_dark_nightmare_1.webp',
  'mon_dark_nightmare_2': '/art/monsters/mon_dark_nightmare_2.webp',
  'mon_dark_shadow_1': '/art/monsters/mon_dark_shadow_1.webp',
  'mon_dark_shadow_2': '/art/monsters/mon_dark_shadow_2.webp',
  'mon_dark_thilli_1': '/art/monsters/mon_dark_thilli_1.webp',
  'mon_dark_thilli_2': '/art/monsters/mon_dark_thilli_2.webp',
  'mon_dark_voido_1': '/art/monsters/mon_dark_voido_1.webp',
  'mon_dark_voido_2': '/art/monsters/mon_dark_voido_2.webp',
  'mon_electric_plazmi_1': '/art/monsters/mon_electric_plazmi_1.webp',
  'mon_electric_plazmi_2': '/art/monsters/mon_electric_plazmi_2.webp',
  'mon_electric_ra3doon_1': '/art/monsters/mon_electric_ra3doon_1.webp',
  'mon_electric_ra3doon_2': '/art/monsters/mon_electric_ra3doon_2.webp',
  'mon_electric_sharara_1': '/art/monsters/mon_electric_sharara_1.webp',
  'mon_electric_sharara_2': '/art/monsters/mon_electric_sharara_2.webp',
  'mon_electric_thandiro_1': '/art/monsters/mon_electric_thandiro_1.webp',
  'mon_electric_thandiro_2': '/art/monsters/mon_electric_thandiro_2.webp',
  'mon_electric_volti_1': '/art/monsters/mon_electric_volti_1.webp',
  'mon_electric_volti_2': '/art/monsters/mon_electric_volti_2.webp',
  'mon_fire_jamra_1': '/art/monsters/mon_fire_jamra_1.webp',
  'mon_fire_jamra_2': '/art/monsters/mon_fire_jamra_2.webp',
  'mon_fire_lahibo_1': '/art/monsters/mon_fire_lahibo_1.webp',
  'mon_fire_lahibo_2': '/art/monsters/mon_fire_lahibo_2.webp',
  'mon_fire_nariks_1': '/art/monsters/mon_fire_nariks_1.webp',
  'mon_fire_nariks_2': '/art/monsters/mon_fire_nariks_2.webp',
  'mon_fire_smoki_1': '/art/monsters/mon_fire_smoki_1.webp',
  'mon_fire_smoki_2': '/art/monsters/mon_fire_smoki_2.webp',
  'mon_fire_volkani_1': '/art/monsters/mon_fire_volkani_1.webp',
  'mon_fire_volkani_2': '/art/monsters/mon_fire_volkani_2.webp',
  'mon_grass_bur3um_1': '/art/monsters/mon_grass_bur3um_1.webp',
  'mon_grass_bur3um_2': '/art/monsters/mon_grass_bur3um_2.webp',
  'mon_grass_fainks_1': '/art/monsters/mon_grass_fainks_1.webp',
  'mon_grass_fainks_2': '/art/monsters/mon_grass_fainks_2.webp',
  'mon_grass_ghabor_1': '/art/monsters/mon_grass_ghabor_1.webp',
  'mon_grass_ghabor_2': '/art/monsters/mon_grass_ghabor_2.webp',
  'mon_grass_shawka_1': '/art/monsters/mon_grass_shawka_1.webp',
  'mon_grass_shawka_2': '/art/monsters/mon_grass_shawka_2.webp',
  'mon_grass_waraqi_1': '/art/monsters/mon_grass_waraqi_1.webp',
  'mon_grass_waraqi_2': '/art/monsters/mon_grass_waraqi_2.webp',
  'mon_psychic_holmi_1': '/art/monsters/mon_psychic_holmi_1.webp',
  'mon_psychic_holmi_2': '/art/monsters/mon_psychic_holmi_2.webp',
  'mon_psychic_nirfa_1': '/art/monsters/mon_psychic_nirfa_1.webp',
  'mon_psychic_nirfa_2': '/art/monsters/mon_psychic_nirfa_2.webp',
  'mon_psychic_orakl_1': '/art/monsters/mon_psychic_orakl_1.webp',
  'mon_psychic_orakl_2': '/art/monsters/mon_psychic_orakl_2.webp',
  'mon_psychic_taifa_1': '/art/monsters/mon_psychic_taifa_1.webp',
  'mon_psychic_taifa_2': '/art/monsters/mon_psychic_taifa_2.webp',
  'mon_psychic_thehno_1': '/art/monsters/mon_psychic_thehno_1.webp',
  'mon_psychic_thehno_2': '/art/monsters/mon_psychic_thehno_2.webp',
  'mon_water_azraqo_1': '/art/monsters/mon_water_azraqo_1.webp',
  'mon_water_azraqo_2': '/art/monsters/mon_water_azraqo_2.webp',
  'mon_water_korali_1': '/art/monsters/mon_water_korali_1.webp',
  'mon_water_korali_2': '/art/monsters/mon_water_korali_2.webp',
  'mon_water_leviathi_1': '/art/monsters/mon_water_leviathi_1.webp',
  'mon_water_leviathi_2': '/art/monsters/mon_water_leviathi_2.webp',
  'mon_water_muwaija_1': '/art/monsters/mon_water_muwaija_1.webp',
  'mon_water_muwaija_2': '/art/monsters/mon_water_muwaija_2.webp',
  'mon_water_tsuna_1': '/art/monsters/mon_water_tsuna_1.webp',
  'mon_water_tsuna_2': '/art/monsters/mon_water_tsuna_2.webp',
};

/** مسار الرسم المُصوَّر لهذه البطاقة، أو `null` فيُرسَم SVG المولّد. */
export function artPathOf(cardId: string): string | null {
  return CARD_ART[cardId] ?? null;
}
