export type SurahMetadataInfo = {
  startPage: number;
  endPage: number;
  totalPages: number;
  versesCount: number;
  nameArabic: string;
  nameSimple: string;
  revelationPlace: "makkah" | "madinah";
};

export const SURAH_PAGE_BOUNDS: Record<number, SurahMetadataInfo> = {
  "1": {
    "startPage": 1,
    "endPage": 1,
    "totalPages": 1,
    "versesCount": 7,
    "nameArabic": "الفاتحة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Fatihah"
  },
  "2": {
    "startPage": 2,
    "endPage": 49,
    "totalPages": 48,
    "versesCount": 286,
    "nameArabic": "البقرة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Baqarah"
  },
  "3": {
    "startPage": 50,
    "endPage": 76,
    "totalPages": 27,
    "versesCount": 200,
    "nameArabic": "آل عمران",
    "revelationPlace": "madinah",
    "nameSimple": "Ali 'Imran"
  },
  "4": {
    "startPage": 77,
    "endPage": 106,
    "totalPages": 30,
    "versesCount": 176,
    "nameArabic": "النساء",
    "revelationPlace": "madinah",
    "nameSimple": "An-Nisa"
  },
  "5": {
    "startPage": 106,
    "endPage": 127,
    "totalPages": 22,
    "versesCount": 120,
    "nameArabic": "المائدة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Ma'idah"
  },
  "6": {
    "startPage": 128,
    "endPage": 150,
    "totalPages": 23,
    "versesCount": 165,
    "nameArabic": "الأنعام",
    "revelationPlace": "makkah",
    "nameSimple": "Al-An'am"
  },
  "7": {
    "startPage": 151,
    "endPage": 176,
    "totalPages": 26,
    "versesCount": 206,
    "nameArabic": "الأعراف",
    "revelationPlace": "makkah",
    "nameSimple": "Al-A'raf"
  },
  "8": {
    "startPage": 177,
    "endPage": 186,
    "totalPages": 10,
    "versesCount": 75,
    "nameArabic": "الأنفال",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Anfal"
  },
  "9": {
    "startPage": 187,
    "endPage": 207,
    "totalPages": 21,
    "versesCount": 129,
    "nameArabic": "التوبة",
    "revelationPlace": "madinah",
    "nameSimple": "At-Tawbah"
  },
  "10": {
    "startPage": 208,
    "endPage": 221,
    "totalPages": 14,
    "versesCount": 109,
    "nameArabic": "يونس",
    "revelationPlace": "makkah",
    "nameSimple": "Yunus"
  },
  "11": {
    "startPage": 221,
    "endPage": 235,
    "totalPages": 15,
    "versesCount": 123,
    "nameArabic": "هود",
    "revelationPlace": "makkah",
    "nameSimple": "Hud"
  },
  "12": {
    "startPage": 235,
    "endPage": 248,
    "totalPages": 14,
    "versesCount": 111,
    "nameArabic": "يوسف",
    "revelationPlace": "makkah",
    "nameSimple": "Yusuf"
  },
  "13": {
    "startPage": 249,
    "endPage": 255,
    "totalPages": 7,
    "versesCount": 43,
    "nameArabic": "الرعد",
    "revelationPlace": "madinah",
    "nameSimple": "Ar-Ra'd"
  },
  "14": {
    "startPage": 255,
    "endPage": 261,
    "totalPages": 7,
    "versesCount": 52,
    "nameArabic": "ابراهيم",
    "revelationPlace": "makkah",
    "nameSimple": "Ibrahim"
  },
  "15": {
    "startPage": 262,
    "endPage": 267,
    "totalPages": 6,
    "versesCount": 99,
    "nameArabic": "الحجر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Hijr"
  },
  "16": {
    "startPage": 267,
    "endPage": 281,
    "totalPages": 15,
    "versesCount": 128,
    "nameArabic": "النحل",
    "revelationPlace": "makkah",
    "nameSimple": "An-Nahl"
  },
  "17": {
    "startPage": 282,
    "endPage": 293,
    "totalPages": 12,
    "versesCount": 111,
    "nameArabic": "الإسراء",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Isra"
  },
  "18": {
    "startPage": 293,
    "endPage": 304,
    "totalPages": 12,
    "versesCount": 110,
    "nameArabic": "الكهف",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Kahf"
  },
  "19": {
    "startPage": 305,
    "endPage": 312,
    "totalPages": 8,
    "versesCount": 98,
    "nameArabic": "مريم",
    "revelationPlace": "makkah",
    "nameSimple": "Maryam"
  },
  "20": {
    "startPage": 312,
    "endPage": 321,
    "totalPages": 10,
    "versesCount": 135,
    "nameArabic": "طه",
    "revelationPlace": "makkah",
    "nameSimple": "Taha"
  },
  "21": {
    "startPage": 322,
    "endPage": 331,
    "totalPages": 10,
    "versesCount": 112,
    "nameArabic": "الأنبياء",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Anbya"
  },
  "22": {
    "startPage": 332,
    "endPage": 341,
    "totalPages": 10,
    "versesCount": 78,
    "nameArabic": "الحج",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Hajj"
  },
  "23": {
    "startPage": 342,
    "endPage": 349,
    "totalPages": 8,
    "versesCount": 118,
    "nameArabic": "المؤمنون",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Mu'minun"
  },
  "24": {
    "startPage": 350,
    "endPage": 359,
    "totalPages": 10,
    "versesCount": 64,
    "nameArabic": "النور",
    "revelationPlace": "madinah",
    "nameSimple": "An-Nur"
  },
  "25": {
    "startPage": 359,
    "endPage": 366,
    "totalPages": 8,
    "versesCount": 77,
    "nameArabic": "الفرقان",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Furqan"
  },
  "26": {
    "startPage": 367,
    "endPage": 376,
    "totalPages": 10,
    "versesCount": 227,
    "nameArabic": "الشعراء",
    "revelationPlace": "makkah",
    "nameSimple": "Ash-Shu'ara"
  },
  "27": {
    "startPage": 377,
    "endPage": 385,
    "totalPages": 9,
    "versesCount": 93,
    "nameArabic": "النمل",
    "revelationPlace": "makkah",
    "nameSimple": "An-Naml"
  },
  "28": {
    "startPage": 385,
    "endPage": 396,
    "totalPages": 12,
    "versesCount": 88,
    "nameArabic": "القصص",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qasas"
  },
  "29": {
    "startPage": 396,
    "endPage": 404,
    "totalPages": 9,
    "versesCount": 69,
    "nameArabic": "العنكبوت",
    "revelationPlace": "makkah",
    "nameSimple": "Al-'Ankabut"
  },
  "30": {
    "startPage": 404,
    "endPage": 410,
    "totalPages": 7,
    "versesCount": 60,
    "nameArabic": "الروم",
    "revelationPlace": "makkah",
    "nameSimple": "Ar-Rum"
  },
  "31": {
    "startPage": 411,
    "endPage": 414,
    "totalPages": 4,
    "versesCount": 34,
    "nameArabic": "لقمان",
    "revelationPlace": "makkah",
    "nameSimple": "Luqman"
  },
  "32": {
    "startPage": 415,
    "endPage": 417,
    "totalPages": 3,
    "versesCount": 30,
    "nameArabic": "السجدة",
    "revelationPlace": "makkah",
    "nameSimple": "As-Sajdah"
  },
  "33": {
    "startPage": 418,
    "endPage": 427,
    "totalPages": 10,
    "versesCount": 73,
    "nameArabic": "الأحزاب",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Ahzab"
  },
  "34": {
    "startPage": 428,
    "endPage": 434,
    "totalPages": 7,
    "versesCount": 54,
    "nameArabic": "سبإ",
    "revelationPlace": "makkah",
    "nameSimple": "Saba"
  },
  "35": {
    "startPage": 434,
    "endPage": 440,
    "totalPages": 7,
    "versesCount": 45,
    "nameArabic": "فاطر",
    "revelationPlace": "makkah",
    "nameSimple": "Fatir"
  },
  "36": {
    "startPage": 440,
    "endPage": 445,
    "totalPages": 6,
    "versesCount": 83,
    "nameArabic": "يس",
    "revelationPlace": "makkah",
    "nameSimple": "Ya-Sin"
  },
  "37": {
    "startPage": 446,
    "endPage": 452,
    "totalPages": 7,
    "versesCount": 182,
    "nameArabic": "الصافات",
    "revelationPlace": "makkah",
    "nameSimple": "As-Saffat"
  },
  "38": {
    "startPage": 453,
    "endPage": 458,
    "totalPages": 6,
    "versesCount": 88,
    "nameArabic": "ص",
    "revelationPlace": "makkah",
    "nameSimple": "Sad"
  },
  "39": {
    "startPage": 458,
    "endPage": 467,
    "totalPages": 10,
    "versesCount": 75,
    "nameArabic": "الزمر",
    "revelationPlace": "makkah",
    "nameSimple": "Az-Zumar"
  },
  "40": {
    "startPage": 467,
    "endPage": 476,
    "totalPages": 10,
    "versesCount": 85,
    "nameArabic": "غافر",
    "revelationPlace": "makkah",
    "nameSimple": "Ghafir"
  },
  "41": {
    "startPage": 477,
    "endPage": 482,
    "totalPages": 6,
    "versesCount": 54,
    "nameArabic": "فصلت",
    "revelationPlace": "makkah",
    "nameSimple": "Fussilat"
  },
  "42": {
    "startPage": 483,
    "endPage": 489,
    "totalPages": 7,
    "versesCount": 53,
    "nameArabic": "الشورى",
    "revelationPlace": "makkah",
    "nameSimple": "Ash-Shuraa"
  },
  "43": {
    "startPage": 489,
    "endPage": 495,
    "totalPages": 7,
    "versesCount": 89,
    "nameArabic": "الزخرف",
    "revelationPlace": "makkah",
    "nameSimple": "Az-Zukhruf"
  },
  "44": {
    "startPage": 496,
    "endPage": 498,
    "totalPages": 3,
    "versesCount": 59,
    "nameArabic": "الدخان",
    "revelationPlace": "makkah",
    "nameSimple": "Ad-Dukhan"
  },
  "45": {
    "startPage": 499,
    "endPage": 502,
    "totalPages": 4,
    "versesCount": 37,
    "nameArabic": "الجاثية",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Jathiyah"
  },
  "46": {
    "startPage": 502,
    "endPage": 506,
    "totalPages": 5,
    "versesCount": 35,
    "nameArabic": "الأحقاف",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Ahqaf"
  },
  "47": {
    "startPage": 507,
    "endPage": 510,
    "totalPages": 4,
    "versesCount": 38,
    "nameArabic": "محمد",
    "revelationPlace": "madinah",
    "nameSimple": "Muhammad"
  },
  "48": {
    "startPage": 511,
    "endPage": 515,
    "totalPages": 5,
    "versesCount": 29,
    "nameArabic": "الفتح",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Fath"
  },
  "49": {
    "startPage": 515,
    "endPage": 517,
    "totalPages": 3,
    "versesCount": 18,
    "nameArabic": "الحجرات",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Hujurat"
  },
  "50": {
    "startPage": 518,
    "endPage": 520,
    "totalPages": 3,
    "versesCount": 45,
    "nameArabic": "ق",
    "revelationPlace": "makkah",
    "nameSimple": "Qaf"
  },
  "51": {
    "startPage": 520,
    "endPage": 523,
    "totalPages": 4,
    "versesCount": 60,
    "nameArabic": "الذاريات",
    "revelationPlace": "makkah",
    "nameSimple": "Adh-Dhariyat"
  },
  "52": {
    "startPage": 523,
    "endPage": 525,
    "totalPages": 3,
    "versesCount": 49,
    "nameArabic": "الطور",
    "revelationPlace": "makkah",
    "nameSimple": "At-Tur"
  },
  "53": {
    "startPage": 526,
    "endPage": 528,
    "totalPages": 3,
    "versesCount": 62,
    "nameArabic": "النجم",
    "revelationPlace": "makkah",
    "nameSimple": "An-Najm"
  },
  "54": {
    "startPage": 528,
    "endPage": 531,
    "totalPages": 4,
    "versesCount": 55,
    "nameArabic": "القمر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qamar"
  },
  "55": {
    "startPage": 531,
    "endPage": 534,
    "totalPages": 4,
    "versesCount": 78,
    "nameArabic": "الرحمن",
    "revelationPlace": "madinah",
    "nameSimple": "Ar-Rahman"
  },
  "56": {
    "startPage": 534,
    "endPage": 537,
    "totalPages": 4,
    "versesCount": 96,
    "nameArabic": "الواقعة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Waqi'ah"
  },
  "57": {
    "startPage": 537,
    "endPage": 541,
    "totalPages": 5,
    "versesCount": 29,
    "nameArabic": "الحديد",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Hadid"
  },
  "58": {
    "startPage": 542,
    "endPage": 545,
    "totalPages": 4,
    "versesCount": 22,
    "nameArabic": "المجادلة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Mujadila"
  },
  "59": {
    "startPage": 545,
    "endPage": 548,
    "totalPages": 4,
    "versesCount": 24,
    "nameArabic": "الحشر",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Hashr"
  },
  "60": {
    "startPage": 549,
    "endPage": 551,
    "totalPages": 3,
    "versesCount": 13,
    "nameArabic": "الممتحنة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Mumtahanah"
  },
  "61": {
    "startPage": 551,
    "endPage": 552,
    "totalPages": 2,
    "versesCount": 14,
    "nameArabic": "الصف",
    "revelationPlace": "madinah",
    "nameSimple": "As-Saf"
  },
  "62": {
    "startPage": 553,
    "endPage": 554,
    "totalPages": 2,
    "versesCount": 11,
    "nameArabic": "الجمعة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Jumu'ah"
  },
  "63": {
    "startPage": 554,
    "endPage": 555,
    "totalPages": 2,
    "versesCount": 11,
    "nameArabic": "المنافقون",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Munafiqun"
  },
  "64": {
    "startPage": 556,
    "endPage": 557,
    "totalPages": 2,
    "versesCount": 18,
    "nameArabic": "التغابن",
    "revelationPlace": "madinah",
    "nameSimple": "At-Taghabun"
  },
  "65": {
    "startPage": 558,
    "endPage": 559,
    "totalPages": 2,
    "versesCount": 12,
    "nameArabic": "الطلاق",
    "revelationPlace": "madinah",
    "nameSimple": "At-Talaq"
  },
  "66": {
    "startPage": 560,
    "endPage": 561,
    "totalPages": 2,
    "versesCount": 12,
    "nameArabic": "التحريم",
    "revelationPlace": "madinah",
    "nameSimple": "At-Tahrim"
  },
  "67": {
    "startPage": 562,
    "endPage": 564,
    "totalPages": 3,
    "versesCount": 30,
    "nameArabic": "الملك",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Mulk"
  },
  "68": {
    "startPage": 564,
    "endPage": 566,
    "totalPages": 3,
    "versesCount": 52,
    "nameArabic": "القلم",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qalam"
  },
  "69": {
    "startPage": 566,
    "endPage": 568,
    "totalPages": 3,
    "versesCount": 52,
    "nameArabic": "الحاقة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Haqqah"
  },
  "70": {
    "startPage": 568,
    "endPage": 570,
    "totalPages": 3,
    "versesCount": 44,
    "nameArabic": "المعارج",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Ma'arij"
  },
  "71": {
    "startPage": 570,
    "endPage": 571,
    "totalPages": 2,
    "versesCount": 28,
    "nameArabic": "نوح",
    "revelationPlace": "makkah",
    "nameSimple": "Nuh"
  },
  "72": {
    "startPage": 572,
    "endPage": 573,
    "totalPages": 2,
    "versesCount": 28,
    "nameArabic": "الجن",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Jinn"
  },
  "73": {
    "startPage": 574,
    "endPage": 575,
    "totalPages": 2,
    "versesCount": 20,
    "nameArabic": "المزمل",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Muzzammil"
  },
  "74": {
    "startPage": 575,
    "endPage": 577,
    "totalPages": 3,
    "versesCount": 56,
    "nameArabic": "المدثر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Muddaththir"
  },
  "75": {
    "startPage": 577,
    "endPage": 578,
    "totalPages": 2,
    "versesCount": 40,
    "nameArabic": "القيامة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qiyamah"
  },
  "76": {
    "startPage": 578,
    "endPage": 580,
    "totalPages": 3,
    "versesCount": 31,
    "nameArabic": "الانسان",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Insan"
  },
  "77": {
    "startPage": 580,
    "endPage": 581,
    "totalPages": 2,
    "versesCount": 50,
    "nameArabic": "المرسلات",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Mursalat"
  },
  "78": {
    "startPage": 582,
    "endPage": 583,
    "totalPages": 2,
    "versesCount": 40,
    "nameArabic": "النبإ",
    "revelationPlace": "makkah",
    "nameSimple": "An-Naba"
  },
  "79": {
    "startPage": 583,
    "endPage": 584,
    "totalPages": 2,
    "versesCount": 46,
    "nameArabic": "النازعات",
    "revelationPlace": "makkah",
    "nameSimple": "An-Nazi'at"
  },
  "80": {
    "startPage": 585,
    "endPage": 585,
    "totalPages": 1,
    "versesCount": 42,
    "nameArabic": "عبس",
    "revelationPlace": "makkah",
    "nameSimple": "'Abasa"
  },
  "81": {
    "startPage": 586,
    "endPage": 586,
    "totalPages": 1,
    "versesCount": 29,
    "nameArabic": "التكوير",
    "revelationPlace": "makkah",
    "nameSimple": "At-Takwir"
  },
  "82": {
    "startPage": 587,
    "endPage": 587,
    "totalPages": 1,
    "versesCount": 19,
    "nameArabic": "الإنفطار",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Infitar"
  },
  "83": {
    "startPage": 587,
    "endPage": 589,
    "totalPages": 3,
    "versesCount": 36,
    "nameArabic": "المطففين",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Mutaffifin"
  },
  "84": {
    "startPage": 589,
    "endPage": 589,
    "totalPages": 1,
    "versesCount": 25,
    "nameArabic": "الإنشقاق",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Inshiqaq"
  },
  "85": {
    "startPage": 590,
    "endPage": 590,
    "totalPages": 1,
    "versesCount": 22,
    "nameArabic": "البروج",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Buruj"
  },
  "86": {
    "startPage": 591,
    "endPage": 591,
    "totalPages": 1,
    "versesCount": 17,
    "nameArabic": "الطارق",
    "revelationPlace": "makkah",
    "nameSimple": "At-Tariq"
  },
  "87": {
    "startPage": 591,
    "endPage": 592,
    "totalPages": 2,
    "versesCount": 19,
    "nameArabic": "الأعلى",
    "revelationPlace": "makkah",
    "nameSimple": "Al-A'la"
  },
  "88": {
    "startPage": 592,
    "endPage": 592,
    "totalPages": 1,
    "versesCount": 26,
    "nameArabic": "الغاشية",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Ghashiyah"
  },
  "89": {
    "startPage": 593,
    "endPage": 594,
    "totalPages": 2,
    "versesCount": 30,
    "nameArabic": "الفجر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Fajr"
  },
  "90": {
    "startPage": 594,
    "endPage": 594,
    "totalPages": 1,
    "versesCount": 20,
    "nameArabic": "البلد",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Balad"
  },
  "91": {
    "startPage": 595,
    "endPage": 595,
    "totalPages": 1,
    "versesCount": 15,
    "nameArabic": "الشمس",
    "revelationPlace": "makkah",
    "nameSimple": "Ash-Shams"
  },
  "92": {
    "startPage": 595,
    "endPage": 596,
    "totalPages": 2,
    "versesCount": 21,
    "nameArabic": "الليل",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Layl"
  },
  "93": {
    "startPage": 596,
    "endPage": 596,
    "totalPages": 1,
    "versesCount": 11,
    "nameArabic": "الضحى",
    "revelationPlace": "makkah",
    "nameSimple": "Ad-Duhaa"
  },
  "94": {
    "startPage": 596,
    "endPage": 596,
    "totalPages": 1,
    "versesCount": 8,
    "nameArabic": "الشرح",
    "revelationPlace": "makkah",
    "nameSimple": "Ash-Sharh"
  },
  "95": {
    "startPage": 597,
    "endPage": 597,
    "totalPages": 1,
    "versesCount": 8,
    "nameArabic": "التين",
    "revelationPlace": "makkah",
    "nameSimple": "At-Tin"
  },
  "96": {
    "startPage": 597,
    "endPage": 597,
    "totalPages": 1,
    "versesCount": 19,
    "nameArabic": "العلق",
    "revelationPlace": "makkah",
    "nameSimple": "Al-'Alaq"
  },
  "97": {
    "startPage": 598,
    "endPage": 598,
    "totalPages": 1,
    "versesCount": 5,
    "nameArabic": "القدر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qadr"
  },
  "98": {
    "startPage": 598,
    "endPage": 599,
    "totalPages": 2,
    "versesCount": 8,
    "nameArabic": "البينة",
    "revelationPlace": "madinah",
    "nameSimple": "Al-Bayyinah"
  },
  "99": {
    "startPage": 599,
    "endPage": 599,
    "totalPages": 1,
    "versesCount": 8,
    "nameArabic": "الزلزلة",
    "revelationPlace": "madinah",
    "nameSimple": "Az-Zalzalah"
  },
  "100": {
    "startPage": 599,
    "endPage": 600,
    "totalPages": 2,
    "versesCount": 11,
    "nameArabic": "العاديات",
    "revelationPlace": "makkah",
    "nameSimple": "Al-'Adiyat"
  },
  "101": {
    "startPage": 600,
    "endPage": 600,
    "totalPages": 1,
    "versesCount": 11,
    "nameArabic": "القارعة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Qari'ah"
  },
  "102": {
    "startPage": 600,
    "endPage": 600,
    "totalPages": 1,
    "versesCount": 8,
    "nameArabic": "التكاثر",
    "revelationPlace": "makkah",
    "nameSimple": "At-Takathur"
  },
  "103": {
    "startPage": 601,
    "endPage": 601,
    "totalPages": 1,
    "versesCount": 3,
    "nameArabic": "العصر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-'Asr"
  },
  "104": {
    "startPage": 601,
    "endPage": 601,
    "totalPages": 1,
    "versesCount": 9,
    "nameArabic": "الهمزة",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Humazah"
  },
  "105": {
    "startPage": 601,
    "endPage": 601,
    "totalPages": 1,
    "versesCount": 5,
    "nameArabic": "الفيل",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Fil"
  },
  "106": {
    "startPage": 602,
    "endPage": 602,
    "totalPages": 1,
    "versesCount": 4,
    "nameArabic": "قريش",
    "revelationPlace": "makkah",
    "nameSimple": "Quraysh"
  },
  "107": {
    "startPage": 602,
    "endPage": 602,
    "totalPages": 1,
    "versesCount": 7,
    "nameArabic": "الماعون",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Ma'un"
  },
  "108": {
    "startPage": 602,
    "endPage": 602,
    "totalPages": 1,
    "versesCount": 3,
    "nameArabic": "الكوثر",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Kawthar"
  },
  "109": {
    "startPage": 603,
    "endPage": 603,
    "totalPages": 1,
    "versesCount": 6,
    "nameArabic": "الكافرون",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Kafirun"
  },
  "110": {
    "startPage": 603,
    "endPage": 603,
    "totalPages": 1,
    "versesCount": 3,
    "nameArabic": "النصر",
    "revelationPlace": "madinah",
    "nameSimple": "An-Nasr"
  },
  "111": {
    "startPage": 603,
    "endPage": 603,
    "totalPages": 1,
    "versesCount": 5,
    "nameArabic": "المسد",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Masad"
  },
  "112": {
    "startPage": 604,
    "endPage": 604,
    "totalPages": 1,
    "versesCount": 4,
    "nameArabic": "الإخلاص",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Ikhlas"
  },
  "113": {
    "startPage": 604,
    "endPage": 604,
    "totalPages": 1,
    "versesCount": 5,
    "nameArabic": "الفلق",
    "revelationPlace": "makkah",
    "nameSimple": "Al-Falaq"
  },
  "114": {
    "startPage": 604,
    "endPage": 604,
    "totalPages": 1,
    "versesCount": 6,
    "nameArabic": "الناس",
    "revelationPlace": "makkah",
    "nameSimple": "An-Nas"
  }
};
