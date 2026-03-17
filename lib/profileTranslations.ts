/** DB'den gelen değeri map anahtarına çevirir (Engineer -> engineer, "Body Type" -> body_type). */
function normKey(v: string | null | undefined): string {
  return String(v ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

/** Seçilen dile göre etiket döndürür (tr / tr-* ile Türkçe, diğer diller için en fallback). */
function labelByLang(label: { tr: string; en: string } | undefined, language: string, raw: string): string {
  if (!label) return raw;
  const isTr = typeof language === 'string' && language.toLowerCase().startsWith('tr');
  return isTr ? label.tr : label.en;
}

export const getEducationLabel = (value: string, language: string) => {
  const educationMap: Record<string, { tr: string; en: string }> = {
    no_diploma: { tr: 'Diploması Yok', en: 'No Diploma' },
    private_school: { tr: 'Özel Okul', en: 'Private School' },
    currently_in_high_school: { tr: 'Halen Lisede', en: 'Currently in High School' },
    associate_degree: { tr: 'Ön Lisans', en: 'Associate Degree' },
    high_school_graduate: { tr: 'Lise Mezunu', en: 'High School Graduate' },
    currently_in_university: { tr: 'Halen Yüksek Okulda', en: 'Currently in University' },
    university_graduate: { tr: 'Üniversite Mezunu', en: 'University Graduate' },
    masters_degree: { tr: 'Yüksek Lisans', en: "Master's Degree" },
    phd_doctorate: { tr: 'PhD/Doktora', en: 'PhD/Doctorate' },
  };
  const label = educationMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

const ALIAS_PROFESSION: Record<string, string> = {
  software_developer: 'software_dev',
  human_resources: 'hr',
  system_admin: 'it_admin',
};

/** Keşfet / profil / mesajlarda meslek alanı: dil seçimine göre Türkçe veya İngilizce döner. constants.professionOptions ile uyumlu. */
export const getProfessionLabel = (value: string, language: string) => {
  const professionMap: Record<string, { tr: string; en: string }> = {
    accounting: { tr: 'Muhasebe', en: 'Accounting' },
    administration: { tr: 'İdare', en: 'Administration' },
    advertising: { tr: 'Reklamcılık', en: 'Advertising' },
    agriculture: { tr: 'Tarım', en: 'Agriculture' },
    architecture: { tr: 'Mimarlık', en: 'Architecture' },
    arts: { tr: 'Sanat', en: 'Arts' },
    automotive: { tr: 'Otomotiv', en: 'Automotive' },
    banking: { tr: 'Bankacılık', en: 'Banking' },
    construction: { tr: 'İnşaat', en: 'Construction' },
    consulting: { tr: 'Danışmanlık', en: 'Consulting' },
    customer_service: { tr: 'Müşteri Hizmetleri', en: 'Customer Service' },
    education: { tr: 'Eğitim', en: 'Education' },
    engineering: { tr: 'Mühendislik', en: 'Engineering' },
    entertainment: { tr: 'Eğlence', en: 'Entertainment' },
    finance: { tr: 'Finans', en: 'Finance' },
    food_beverage: { tr: 'Yiyecek İçecek', en: 'Food & Beverage' },
    healthcare: { tr: 'Sağlık', en: 'Healthcare' },
    hospitality: { tr: 'Misafirperverlik', en: 'Hospitality' },
    human_resources: { tr: 'İnsan Kaynakları', en: 'Human Resources' },
    hr: { tr: 'İnsan Kaynakları', en: 'Human Resources' },
    information_technology: { tr: 'Bilgi Teknolojileri', en: 'Information Technology' },
    insurance: { tr: 'Sigorta', en: 'Insurance' },
    journalism: { tr: 'Gazetecilik', en: 'Journalism' },
    legal: { tr: 'Hukuk', en: 'Legal' },
    logistics: { tr: 'Lojistik', en: 'Logistics' },
    manufacturing: { tr: 'İmalat', en: 'Manufacturing' },
    marketing: { tr: 'Pazarlama', en: 'Marketing' },
    media: { tr: 'Medya', en: 'Media' },
    military: { tr: 'Askeri', en: 'Military' },
    nonprofit: { tr: 'Kar Amacı Gütmeyen', en: 'Nonprofit' },
    pharmaceuticals: { tr: 'İlaç', en: 'Pharmaceuticals' },
    photography: { tr: 'Fotoğrafçılık', en: 'Photography' },
    public_relations: { tr: 'Halkla İlişkiler', en: 'Public Relations' },
    real_estate: { tr: 'Emlak', en: 'Real Estate' },
    research: { tr: 'Araştırma', en: 'Research' },
    retail: { tr: 'Perakende', en: 'Retail' },
    sales: { tr: 'Satış', en: 'Sales' },
    science: { tr: 'Bilim', en: 'Science' },
    social_services: { tr: 'Sosyal Hizmetler', en: 'Social Services' },
    sports: { tr: 'Spor', en: 'Sports' },
    technology: { tr: 'Teknoloji', en: 'Technology' },
    telecommunications: { tr: 'Telekomünikasyon', en: 'Telecommunications' },
    tourism: { tr: 'Turizm', en: 'Tourism' },
    transportation: { tr: 'Ulaşım', en: 'Transportation' },
    student: { tr: 'Öğrenci', en: 'Student' },
    unemployed: { tr: 'İşsiz', en: 'Unemployed' },
    retired: { tr: 'Emekli', en: 'Retired' },
    self_employed: { tr: 'Serbest Meslek', en: 'Self Employed' },
    other: { tr: 'Diğer', en: 'Other' },
    academic: { tr: 'Akademisyen / Öğretmen', en: 'Academic / Teacher' },
    researcher: { tr: 'Araştırmacı', en: 'Researcher' },
    engineer: { tr: 'Mühendis', en: 'Engineer' },
    doctor: { tr: 'Doktor / Sağlık çalışanı', en: 'Doctor / Healthcare' },
    lawyer: { tr: 'Avukat / Hukuk', en: 'Lawyer / Legal' },
    manager: { tr: 'Yönetici / Müdür', en: 'Manager / Director' },
    software_dev: { tr: 'Yazılım geliştirici', en: 'Software Developer' },
    it_admin: { tr: 'IT / Sistem yöneticisi', en: 'IT / System Admin' },
    data_analyst: { tr: 'Veri analisti', en: 'Data Analyst' },
    designer: { tr: 'Tasarımcı (UI/UX, Grafik)', en: 'Designer (UI/UX, Graphic)' },
    entrepreneur: { tr: 'Girişimci', en: 'Entrepreneur' },
    tradesman: { tr: 'Esnaf', en: 'Tradesman' },
    artist: { tr: 'Sanatçı', en: 'Artist' },
    writer: { tr: 'Yazar / İçerik üreticisi', en: 'Writer / Content Creator' },
    musician: { tr: 'Müzisyen', en: 'Musician' },
    technician: { tr: 'Teknisyen', en: 'Technician' },
    craftsman: { tr: 'Usta / Zanaatkar', en: 'Craftsman / Artisan' },
    freelancer: { tr: 'Freelancer / Serbest çalışan', en: 'Freelancer' },
    not_working: { tr: 'Çalışmıyor', en: 'Not Working' },
    homemaker: { tr: 'Ev hanımı / Ev yöneticisi', en: 'Homemaker' },
  };
  const key = normKey(value);
  const resolvedKey = ALIAS_PROFESSION[key] ?? key;
  const label = professionMap[resolvedKey];
  return labelByLang(label, language, String(value ?? ''));
};

export const getChildrenStatusLabel = (value: string, language: string) => {
  const childrenMap: Record<string, { tr: string; en: string }> = {
    no_children: { tr: 'Çocuk Yok', en: 'No Children' },
    has_children: { tr: 'Çocuk Var', en: 'Has Children' },
    want_children: { tr: 'Çocuk İstiyor', en: 'Wants Children' },
    dont_want: { tr: 'Çocuk İstemiyor', en: "Doesn't Want Children" },
    want_someday: { tr: 'Bir Gün İstiyor', en: 'Want Someday' },
    have: { tr: 'Sahibim', en: 'Have' },
    want_more: { tr: 'Daha Fazla İstiyorum', en: 'Want More' },
    dont_want_more: { tr: 'Daha Fazla İstemiyorum', en: "Don't Want More" },
  };
  const label = childrenMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getSmokingLabel = (value: string, language: string) => {
  const smokingMap: Record<string, { tr: string; en: string }> = {
    yes: { tr: 'Evet', en: 'Yes' },
    no: { tr: 'Hayır', en: 'No' },
    sometimes: { tr: 'Bazen', en: 'Sometimes' },
    trying_to_quit: { tr: 'Bırakmaya Çalışıyor', en: 'Trying to Quit' },
  };
  const label = smokingMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getAlcoholLabel = (value: string, language: string) => {
  const alcoholMap: Record<string, { tr: string; en: string }> = {
    yes: { tr: 'Evet', en: 'Yes' },
    no: { tr: 'Hayır', en: 'No' },
    sometimes: { tr: 'Bazen', en: 'Sometimes' },
    socially: { tr: 'Sosyal Ortamlarda', en: 'Socially' },
    often: { tr: 'Sık Sık', en: 'Often' },
    never: { tr: 'Asla', en: 'Never' },
    social: { tr: 'Sosyal', en: 'Social' },
  };
  const label = alcoholMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getBodyTypeLabel = (value: string, language: string) => {
  const bodyTypeMap: Record<string, { tr: string; en: string }> = {
    slim: { tr: 'İnce', en: 'Slim' },
    average: { tr: 'Ortalama', en: 'Average' },
    athletic: { tr: 'Atletik', en: 'Athletic' },
    muscular: { tr: 'Kaslı', en: 'Muscular' },
    curvy: { tr: 'Dolgun', en: 'Curvy' },
    heavyset: { tr: 'İri Yapılı', en: 'Heavyset' },
  };
  const label = bodyTypeMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getRelationshipStatusLabel = (value: string, language: string) => {
  const relationshipMap: Record<string, { tr: string; en: string }> = {
    single: { tr: 'Bekar', en: 'Single' },
    divorced: { tr: 'Boşanmış', en: 'Divorced' },
    widowed: { tr: 'Dul', en: 'Widowed' },
    separated: { tr: 'Ayrı', en: 'Separated' },
  };
  const label = relationshipMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getReligionLabel = (value: string, language: string) => {
  const religionMap: Record<string, { tr: string; en: string }> = {
    muslim: { tr: 'Müslüman', en: 'Muslim' },
    christian: { tr: 'Hristiyan', en: 'Christian' },
    jewish: { tr: 'Yahudi', en: 'Jewish' },
    hindu: { tr: 'Hindu', en: 'Hindu' },
    buddhist: { tr: 'Budist', en: 'Buddhist' },
    atheist: { tr: 'Ateist', en: 'Atheist' },
    agnostic: { tr: 'Agnostik', en: 'Agnostic' },
    other: { tr: 'Diğer', en: 'Other' },
  };
  const label = religionMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};

export const getGenderLabel = (value: string, language: string) => {
  const genderMap: Record<string, { tr: string; en: string }> = {
    male: { tr: 'Erkek', en: 'Male' },
    female: { tr: 'Kadın', en: 'Female' },
    other: { tr: 'Diğer', en: 'Other' },
  };
  const label = genderMap[normKey(value)];
  return labelByLang(label, language, String(value ?? ''));
};
