# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> home (en-dark) >> surah list
- Location: e2e/tests/visual.spec.ts:73:11

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  5170 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: home-en-dark.png

Call log:
  - Expect "toHaveScreenshot(home-en-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 5170 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 5170 pixels (ratio 0.02 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Home" [ref=e6] [cursor=pointer]:
          - /url: /
          - img [ref=e7]
        - button "Search surah by name or number" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
        - generic [ref=e14]:
          - link [ref=e15] [cursor=pointer]:
            - /url: /en/mushaf
            - img [ref=e16]
          - link [ref=e21] [cursor=pointer]:
            - /url: /en/marks
            - img [ref=e22]
          - link [ref=e24] [cursor=pointer]:
            - /url: /en/plans
            - img [ref=e25]
          - button "Settings" [ref=e29] [cursor=pointer]:
            - img
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]: Memorize the Quran
        - heading "Furqan" [level=1] [ref=e33]
        - paragraph [ref=e34]: Every word is a trust, every verse a journey — annotate, reflect, and perfect your memorization of the Noble Quran, guided step by step alongside your teacher.
      - generic [ref=e35]:
        - link "1 Al-Fatihah The Opener 001 7 Verses" [ref=e36] [cursor=pointer]:
          - /url: /en/pages/1
          - generic [ref=e37]: "1"
          - generic [ref=e38]:
            - generic [ref=e39]: Al-Fatihah
            - generic [ref=e40]: The Opener
          - generic [ref=e41]:
            - generic [ref=e42]: "001"
            - generic [ref=e43]: 7 Verses
        - link "2 Al-Baqarah The Cow 002 286 Verses" [ref=e44] [cursor=pointer]:
          - /url: /en/pages/2
          - generic [ref=e45]: "2"
          - generic [ref=e46]:
            - generic [ref=e47]: Al-Baqarah
            - generic [ref=e48]: The Cow
          - generic [ref=e49]:
            - generic [ref=e50]: "002"
            - generic [ref=e51]: 286 Verses
        - link "3 Ali 'Imran Family of Imran 003 200 Verses" [ref=e52] [cursor=pointer]:
          - /url: /en/pages/50
          - generic [ref=e53]: "3"
          - generic [ref=e54]:
            - generic [ref=e55]: Ali 'Imran
            - generic [ref=e56]: Family of Imran
          - generic [ref=e57]:
            - generic [ref=e58]: "003"
            - generic [ref=e59]: 200 Verses
        - link "4 An-Nisa The Women 004 176 Verses" [ref=e60] [cursor=pointer]:
          - /url: /en/pages/77
          - generic [ref=e61]: "4"
          - generic [ref=e62]:
            - generic [ref=e63]: An-Nisa
            - generic [ref=e64]: The Women
          - generic [ref=e65]:
            - generic [ref=e66]: "004"
            - generic [ref=e67]: 176 Verses
        - link "5 Al-Ma'idah The Table Spread 005 120 Verses" [ref=e68] [cursor=pointer]:
          - /url: /en/pages/106
          - generic [ref=e69]: "5"
          - generic [ref=e70]:
            - generic [ref=e71]: Al-Ma'idah
            - generic [ref=e72]: The Table Spread
          - generic [ref=e73]:
            - generic [ref=e74]: "005"
            - generic [ref=e75]: 120 Verses
        - link "6 Al-An'am The Cattle 006 165 Verses" [ref=e76] [cursor=pointer]:
          - /url: /en/pages/128
          - generic [ref=e77]: "6"
          - generic [ref=e78]:
            - generic [ref=e79]: Al-An'am
            - generic [ref=e80]: The Cattle
          - generic [ref=e81]:
            - generic [ref=e82]: "006"
            - generic [ref=e83]: 165 Verses
        - link "7 Al-A'raf The Heights 007 206 Verses" [ref=e84] [cursor=pointer]:
          - /url: /en/pages/151
          - generic [ref=e85]: "7"
          - generic [ref=e86]:
            - generic [ref=e87]: Al-A'raf
            - generic [ref=e88]: The Heights
          - generic [ref=e89]:
            - generic [ref=e90]: "007"
            - generic [ref=e91]: 206 Verses
        - link "8 Al-Anfal The Spoils of War 008 75 Verses" [ref=e92] [cursor=pointer]:
          - /url: /en/pages/177
          - generic [ref=e93]: "8"
          - generic [ref=e94]:
            - generic [ref=e95]: Al-Anfal
            - generic [ref=e96]: The Spoils of War
          - generic [ref=e97]:
            - generic [ref=e98]: "008"
            - generic [ref=e99]: 75 Verses
        - link "9 At-Tawbah The Repentance 009 129 Verses" [ref=e100] [cursor=pointer]:
          - /url: /en/pages/187
          - generic [ref=e101]: "9"
          - generic [ref=e102]:
            - generic [ref=e103]: At-Tawbah
            - generic [ref=e104]: The Repentance
          - generic [ref=e105]:
            - generic [ref=e106]: "009"
            - generic [ref=e107]: 129 Verses
        - link "10 Yunus Jonah 010 109 Verses" [ref=e108] [cursor=pointer]:
          - /url: /en/pages/208
          - generic [ref=e109]: "10"
          - generic [ref=e110]:
            - generic [ref=e111]: Yunus
            - generic [ref=e112]: Jonah
          - generic [ref=e113]:
            - generic [ref=e114]: "010"
            - generic [ref=e115]: 109 Verses
        - link "11 Hud Hud 011 123 Verses" [ref=e116] [cursor=pointer]:
          - /url: /en/pages/221
          - generic [ref=e117]: "11"
          - generic [ref=e118]:
            - generic [ref=e119]: Hud
            - generic [ref=e120]: Hud
          - generic [ref=e121]:
            - generic [ref=e122]: "011"
            - generic [ref=e123]: 123 Verses
        - link "12 Yusuf Joseph 012 111 Verses" [ref=e124] [cursor=pointer]:
          - /url: /en/pages/235
          - generic [ref=e125]: "12"
          - generic [ref=e126]:
            - generic [ref=e127]: Yusuf
            - generic [ref=e128]: Joseph
          - generic [ref=e129]:
            - generic [ref=e130]: "012"
            - generic [ref=e131]: 111 Verses
        - link "13 Ar-Ra'd The Thunder 013 43 Verses" [ref=e132] [cursor=pointer]:
          - /url: /en/pages/249
          - generic [ref=e133]: "13"
          - generic [ref=e134]:
            - generic [ref=e135]: Ar-Ra'd
            - generic [ref=e136]: The Thunder
          - generic [ref=e137]:
            - generic [ref=e138]: "013"
            - generic [ref=e139]: 43 Verses
        - link "14 Ibrahim Abraham 014 52 Verses" [ref=e140] [cursor=pointer]:
          - /url: /en/pages/255
          - generic [ref=e141]: "14"
          - generic [ref=e142]:
            - generic [ref=e143]: Ibrahim
            - generic [ref=e144]: Abraham
          - generic [ref=e145]:
            - generic [ref=e146]: "014"
            - generic [ref=e147]: 52 Verses
        - link "15 Al-Hijr The Rocky Tract 015 99 Verses" [ref=e148] [cursor=pointer]:
          - /url: /en/pages/262
          - generic [ref=e149]: "15"
          - generic [ref=e150]:
            - generic [ref=e151]: Al-Hijr
            - generic [ref=e152]: The Rocky Tract
          - generic [ref=e153]:
            - generic [ref=e154]: "015"
            - generic [ref=e155]: 99 Verses
        - link "16 An-Nahl The Bee 016 128 Verses" [ref=e156] [cursor=pointer]:
          - /url: /en/pages/267
          - generic [ref=e157]: "16"
          - generic [ref=e158]:
            - generic [ref=e159]: An-Nahl
            - generic [ref=e160]: The Bee
          - generic [ref=e161]:
            - generic [ref=e162]: "016"
            - generic [ref=e163]: 128 Verses
        - link "17 Al-Isra The Night Journey 017 111 Verses" [ref=e164] [cursor=pointer]:
          - /url: /en/pages/282
          - generic [ref=e165]: "17"
          - generic [ref=e166]:
            - generic [ref=e167]: Al-Isra
            - generic [ref=e168]: The Night Journey
          - generic [ref=e169]:
            - generic [ref=e170]: "017"
            - generic [ref=e171]: 111 Verses
        - link "18 Al-Kahf The Cave 018 110 Verses" [ref=e172] [cursor=pointer]:
          - /url: /en/pages/293
          - generic [ref=e173]: "18"
          - generic [ref=e174]:
            - generic [ref=e175]: Al-Kahf
            - generic [ref=e176]: The Cave
          - generic [ref=e177]:
            - generic [ref=e178]: "018"
            - generic [ref=e179]: 110 Verses
        - link "19 Maryam Mary 019 98 Verses" [ref=e180] [cursor=pointer]:
          - /url: /en/pages/305
          - generic [ref=e181]: "19"
          - generic [ref=e182]:
            - generic [ref=e183]: Maryam
            - generic [ref=e184]: Mary
          - generic [ref=e185]:
            - generic [ref=e186]: "019"
            - generic [ref=e187]: 98 Verses
        - link "20 Taha Ta-Ha 020 135 Verses" [ref=e188] [cursor=pointer]:
          - /url: /en/pages/312
          - generic [ref=e189]: "20"
          - generic [ref=e190]:
            - generic [ref=e191]: Taha
            - generic [ref=e192]: Ta-Ha
          - generic [ref=e193]:
            - generic [ref=e194]: "020"
            - generic [ref=e195]: 135 Verses
        - link "21 Al-Anbya The Prophets 021 112 Verses" [ref=e196] [cursor=pointer]:
          - /url: /en/pages/322
          - generic [ref=e197]: "21"
          - generic [ref=e198]:
            - generic [ref=e199]: Al-Anbya
            - generic [ref=e200]: The Prophets
          - generic [ref=e201]:
            - generic [ref=e202]: "021"
            - generic [ref=e203]: 112 Verses
        - link "22 Al-Hajj The Pilgrimage 022 78 Verses" [ref=e204] [cursor=pointer]:
          - /url: /en/pages/332
          - generic [ref=e205]: "22"
          - generic [ref=e206]:
            - generic [ref=e207]: Al-Hajj
            - generic [ref=e208]: The Pilgrimage
          - generic [ref=e209]:
            - generic [ref=e210]: "022"
            - generic [ref=e211]: 78 Verses
        - link "23 Al-Mu'minun The Believers 023 118 Verses" [ref=e212] [cursor=pointer]:
          - /url: /en/pages/342
          - generic [ref=e213]: "23"
          - generic [ref=e214]:
            - generic [ref=e215]: Al-Mu'minun
            - generic [ref=e216]: The Believers
          - generic [ref=e217]:
            - generic [ref=e218]: "023"
            - generic [ref=e219]: 118 Verses
        - link "24 An-Nur The Light 024 64 Verses" [ref=e220] [cursor=pointer]:
          - /url: /en/pages/350
          - generic [ref=e221]: "24"
          - generic [ref=e222]:
            - generic [ref=e223]: An-Nur
            - generic [ref=e224]: The Light
          - generic [ref=e225]:
            - generic [ref=e226]: "024"
            - generic [ref=e227]: 64 Verses
        - link "25 Al-Furqan The Criterion 025 77 Verses" [ref=e228] [cursor=pointer]:
          - /url: /en/pages/359
          - generic [ref=e229]: "25"
          - generic [ref=e230]:
            - generic [ref=e231]: Al-Furqan
            - generic [ref=e232]: The Criterion
          - generic [ref=e233]:
            - generic [ref=e234]: "025"
            - generic [ref=e235]: 77 Verses
        - link "26 Ash-Shu'ara The Poets 026 227 Verses" [ref=e236] [cursor=pointer]:
          - /url: /en/pages/367
          - generic [ref=e237]: "26"
          - generic [ref=e238]:
            - generic [ref=e239]: Ash-Shu'ara
            - generic [ref=e240]: The Poets
          - generic [ref=e241]:
            - generic [ref=e242]: "026"
            - generic [ref=e243]: 227 Verses
        - link "27 An-Naml The Ant 027 93 Verses" [ref=e244] [cursor=pointer]:
          - /url: /en/pages/377
          - generic [ref=e245]: "27"
          - generic [ref=e246]:
            - generic [ref=e247]: An-Naml
            - generic [ref=e248]: The Ant
          - generic [ref=e249]:
            - generic [ref=e250]: "027"
            - generic [ref=e251]: 93 Verses
        - link "28 Al-Qasas The Stories 028 88 Verses" [ref=e252] [cursor=pointer]:
          - /url: /en/pages/385
          - generic [ref=e253]: "28"
          - generic [ref=e254]:
            - generic [ref=e255]: Al-Qasas
            - generic [ref=e256]: The Stories
          - generic [ref=e257]:
            - generic [ref=e258]: "028"
            - generic [ref=e259]: 88 Verses
        - link "29 Al-'Ankabut The Spider 029 69 Verses" [ref=e260] [cursor=pointer]:
          - /url: /en/pages/396
          - generic [ref=e261]: "29"
          - generic [ref=e262]:
            - generic [ref=e263]: Al-'Ankabut
            - generic [ref=e264]: The Spider
          - generic [ref=e265]:
            - generic [ref=e266]: "029"
            - generic [ref=e267]: 69 Verses
        - link "30 Ar-Rum The Romans 030 60 Verses" [ref=e268] [cursor=pointer]:
          - /url: /en/pages/404
          - generic [ref=e269]: "30"
          - generic [ref=e270]:
            - generic [ref=e271]: Ar-Rum
            - generic [ref=e272]: The Romans
          - generic [ref=e273]:
            - generic [ref=e274]: "030"
            - generic [ref=e275]: 60 Verses
        - link "31 Luqman Luqman 031 34 Verses" [ref=e276] [cursor=pointer]:
          - /url: /en/pages/411
          - generic [ref=e277]: "31"
          - generic [ref=e278]:
            - generic [ref=e279]: Luqman
            - generic [ref=e280]: Luqman
          - generic [ref=e281]:
            - generic [ref=e282]: "031"
            - generic [ref=e283]: 34 Verses
        - link "32 As-Sajdah The Prostration 032 30 Verses" [ref=e284] [cursor=pointer]:
          - /url: /en/pages/415
          - generic [ref=e285]: "32"
          - generic [ref=e286]:
            - generic [ref=e287]: As-Sajdah
            - generic [ref=e288]: The Prostration
          - generic [ref=e289]:
            - generic [ref=e290]: "032"
            - generic [ref=e291]: 30 Verses
        - link "33 Al-Ahzab The Combined Forces 033 73 Verses" [ref=e292] [cursor=pointer]:
          - /url: /en/pages/418
          - generic [ref=e293]: "33"
          - generic [ref=e294]:
            - generic [ref=e295]: Al-Ahzab
            - generic [ref=e296]: The Combined Forces
          - generic [ref=e297]:
            - generic [ref=e298]: "033"
            - generic [ref=e299]: 73 Verses
        - link "34 Saba Sheba 034 54 Verses" [ref=e300] [cursor=pointer]:
          - /url: /en/pages/428
          - generic [ref=e301]: "34"
          - generic [ref=e302]:
            - generic [ref=e303]: Saba
            - generic [ref=e304]: Sheba
          - generic [ref=e305]:
            - generic [ref=e306]: "034"
            - generic [ref=e307]: 54 Verses
        - link "35 Fatir Originator 035 45 Verses" [ref=e308] [cursor=pointer]:
          - /url: /en/pages/434
          - generic [ref=e309]: "35"
          - generic [ref=e310]:
            - generic [ref=e311]: Fatir
            - generic [ref=e312]: Originator
          - generic [ref=e313]:
            - generic [ref=e314]: "035"
            - generic [ref=e315]: 45 Verses
        - link "36 Ya-Sin Ya Sin 036 83 Verses" [ref=e316] [cursor=pointer]:
          - /url: /en/pages/440
          - generic [ref=e317]: "36"
          - generic [ref=e318]:
            - generic [ref=e319]: Ya-Sin
            - generic [ref=e320]: Ya Sin
          - generic [ref=e321]:
            - generic [ref=e322]: "036"
            - generic [ref=e323]: 83 Verses
        - link "37 As-Saffat Those who set the Ranks 037 182 Verses" [ref=e324] [cursor=pointer]:
          - /url: /en/pages/446
          - generic [ref=e325]: "37"
          - generic [ref=e326]:
            - generic [ref=e327]: As-Saffat
            - generic [ref=e328]: Those who set the Ranks
          - generic [ref=e329]:
            - generic [ref=e330]: "037"
            - generic [ref=e331]: 182 Verses
        - link "38 Sad The Letter \"Saad\" 038 88 Verses" [ref=e332] [cursor=pointer]:
          - /url: /en/pages/453
          - generic [ref=e333]: "38"
          - generic [ref=e334]:
            - generic [ref=e335]: Sad
            - generic [ref=e336]: The Letter "Saad"
          - generic [ref=e337]:
            - generic [ref=e338]: "038"
            - generic [ref=e339]: 88 Verses
        - link "39 Az-Zumar The Troops 039 75 Verses" [ref=e340] [cursor=pointer]:
          - /url: /en/pages/458
          - generic [ref=e341]: "39"
          - generic [ref=e342]:
            - generic [ref=e343]: Az-Zumar
            - generic [ref=e344]: The Troops
          - generic [ref=e345]:
            - generic [ref=e346]: "039"
            - generic [ref=e347]: 75 Verses
        - link "40 Ghafir The Forgiver 040 85 Verses" [ref=e348] [cursor=pointer]:
          - /url: /en/pages/467
          - generic [ref=e349]: "40"
          - generic [ref=e350]:
            - generic [ref=e351]: Ghafir
            - generic [ref=e352]: The Forgiver
          - generic [ref=e353]:
            - generic [ref=e354]: "040"
            - generic [ref=e355]: 85 Verses
        - link "41 Fussilat Explained in Detail 041 54 Verses" [ref=e356] [cursor=pointer]:
          - /url: /en/pages/477
          - generic [ref=e357]: "41"
          - generic [ref=e358]:
            - generic [ref=e359]: Fussilat
            - generic [ref=e360]: Explained in Detail
          - generic [ref=e361]:
            - generic [ref=e362]: "041"
            - generic [ref=e363]: 54 Verses
        - link "42 Ash-Shuraa The Consultation 042 53 Verses" [ref=e364] [cursor=pointer]:
          - /url: /en/pages/483
          - generic [ref=e365]: "42"
          - generic [ref=e366]:
            - generic [ref=e367]: Ash-Shuraa
            - generic [ref=e368]: The Consultation
          - generic [ref=e369]:
            - generic [ref=e370]: "042"
            - generic [ref=e371]: 53 Verses
        - link "43 Az-Zukhruf The Ornaments of Gold 043 89 Verses" [ref=e372] [cursor=pointer]:
          - /url: /en/pages/489
          - generic [ref=e373]: "43"
          - generic [ref=e374]:
            - generic [ref=e375]: Az-Zukhruf
            - generic [ref=e376]: The Ornaments of Gold
          - generic [ref=e377]:
            - generic [ref=e378]: "043"
            - generic [ref=e379]: 89 Verses
        - link "44 Ad-Dukhan The Smoke 044 59 Verses" [ref=e380] [cursor=pointer]:
          - /url: /en/pages/496
          - generic [ref=e381]: "44"
          - generic [ref=e382]:
            - generic [ref=e383]: Ad-Dukhan
            - generic [ref=e384]: The Smoke
          - generic [ref=e385]:
            - generic [ref=e386]: "044"
            - generic [ref=e387]: 59 Verses
        - link "45 Al-Jathiyah The Crouching 045 37 Verses" [ref=e388] [cursor=pointer]:
          - /url: /en/pages/499
          - generic [ref=e389]: "45"
          - generic [ref=e390]:
            - generic [ref=e391]: Al-Jathiyah
            - generic [ref=e392]: The Crouching
          - generic [ref=e393]:
            - generic [ref=e394]: "045"
            - generic [ref=e395]: 37 Verses
        - link "46 Al-Ahqaf The Wind-Curved Sandhills 046 35 Verses" [ref=e396] [cursor=pointer]:
          - /url: /en/pages/502
          - generic [ref=e397]: "46"
          - generic [ref=e398]:
            - generic [ref=e399]: Al-Ahqaf
            - generic [ref=e400]: The Wind-Curved Sandhills
          - generic [ref=e401]:
            - generic [ref=e402]: "046"
            - generic [ref=e403]: 35 Verses
        - link "47 Muhammad Muhammad 047 38 Verses" [ref=e404] [cursor=pointer]:
          - /url: /en/pages/507
          - generic [ref=e405]: "47"
          - generic [ref=e406]:
            - generic [ref=e407]: Muhammad
            - generic [ref=e408]: Muhammad
          - generic [ref=e409]:
            - generic [ref=e410]: "047"
            - generic [ref=e411]: 38 Verses
        - link "48 Al-Fath The Victory 048 29 Verses" [ref=e412] [cursor=pointer]:
          - /url: /en/pages/511
          - generic [ref=e413]: "48"
          - generic [ref=e414]:
            - generic [ref=e415]: Al-Fath
            - generic [ref=e416]: The Victory
          - generic [ref=e417]:
            - generic [ref=e418]: "048"
            - generic [ref=e419]: 29 Verses
        - link "49 Al-Hujurat The Rooms 049 18 Verses" [ref=e420] [cursor=pointer]:
          - /url: /en/pages/515
          - generic [ref=e421]: "49"
          - generic [ref=e422]:
            - generic [ref=e423]: Al-Hujurat
            - generic [ref=e424]: The Rooms
          - generic [ref=e425]:
            - generic [ref=e426]: "049"
            - generic [ref=e427]: 18 Verses
        - link "50 Qaf The Letter \"Qaf\" 050 45 Verses" [ref=e428] [cursor=pointer]:
          - /url: /en/pages/518
          - generic [ref=e429]: "50"
          - generic [ref=e430]:
            - generic [ref=e431]: Qaf
            - generic [ref=e432]: The Letter "Qaf"
          - generic [ref=e433]:
            - generic [ref=e434]: "050"
            - generic [ref=e435]: 45 Verses
        - link "51 Adh-Dhariyat The Winnowing Winds 051 60 Verses" [ref=e436] [cursor=pointer]:
          - /url: /en/pages/520
          - generic [ref=e437]: "51"
          - generic [ref=e438]:
            - generic [ref=e439]: Adh-Dhariyat
            - generic [ref=e440]: The Winnowing Winds
          - generic [ref=e441]:
            - generic [ref=e442]: "051"
            - generic [ref=e443]: 60 Verses
        - link "52 At-Tur The Mount 052 49 Verses" [ref=e444] [cursor=pointer]:
          - /url: /en/pages/523
          - generic [ref=e445]: "52"
          - generic [ref=e446]:
            - generic [ref=e447]: At-Tur
            - generic [ref=e448]: The Mount
          - generic [ref=e449]:
            - generic [ref=e450]: "052"
            - generic [ref=e451]: 49 Verses
        - link "53 An-Najm The Star 053 62 Verses" [ref=e452] [cursor=pointer]:
          - /url: /en/pages/526
          - generic [ref=e453]: "53"
          - generic [ref=e454]:
            - generic [ref=e455]: An-Najm
            - generic [ref=e456]: The Star
          - generic [ref=e457]:
            - generic [ref=e458]: "053"
            - generic [ref=e459]: 62 Verses
        - link "54 Al-Qamar The Moon 054 55 Verses" [ref=e460] [cursor=pointer]:
          - /url: /en/pages/528
          - generic [ref=e461]: "54"
          - generic [ref=e462]:
            - generic [ref=e463]: Al-Qamar
            - generic [ref=e464]: The Moon
          - generic [ref=e465]:
            - generic [ref=e466]: "054"
            - generic [ref=e467]: 55 Verses
        - link "55 Ar-Rahman The Beneficent 055 78 Verses" [ref=e468] [cursor=pointer]:
          - /url: /en/pages/531
          - generic [ref=e469]: "55"
          - generic [ref=e470]:
            - generic [ref=e471]: Ar-Rahman
            - generic [ref=e472]: The Beneficent
          - generic [ref=e473]:
            - generic [ref=e474]: "055"
            - generic [ref=e475]: 78 Verses
        - link "56 Al-Waqi'ah The Inevitable 056 96 Verses" [ref=e476] [cursor=pointer]:
          - /url: /en/pages/534
          - generic [ref=e477]: "56"
          - generic [ref=e478]:
            - generic [ref=e479]: Al-Waqi'ah
            - generic [ref=e480]: The Inevitable
          - generic [ref=e481]:
            - generic [ref=e482]: "056"
            - generic [ref=e483]: 96 Verses
        - link "57 Al-Hadid The Iron 057 29 Verses" [ref=e484] [cursor=pointer]:
          - /url: /en/pages/537
          - generic [ref=e485]: "57"
          - generic [ref=e486]:
            - generic [ref=e487]: Al-Hadid
            - generic [ref=e488]: The Iron
          - generic [ref=e489]:
            - generic [ref=e490]: "057"
            - generic [ref=e491]: 29 Verses
        - link "58 Al-Mujadila The Pleading Woman 058 22 Verses" [ref=e492] [cursor=pointer]:
          - /url: /en/pages/542
          - generic [ref=e493]: "58"
          - generic [ref=e494]:
            - generic [ref=e495]: Al-Mujadila
            - generic [ref=e496]: The Pleading Woman
          - generic [ref=e497]:
            - generic [ref=e498]: "058"
            - generic [ref=e499]: 22 Verses
        - link "59 Al-Hashr The Exile 059 24 Verses" [ref=e500] [cursor=pointer]:
          - /url: /en/pages/545
          - generic [ref=e501]: "59"
          - generic [ref=e502]:
            - generic [ref=e503]: Al-Hashr
            - generic [ref=e504]: The Exile
          - generic [ref=e505]:
            - generic [ref=e506]: "059"
            - generic [ref=e507]: 24 Verses
        - link "60 Al-Mumtahanah She that is to be examined 060 13 Verses" [ref=e508] [cursor=pointer]:
          - /url: /en/pages/549
          - generic [ref=e509]: "60"
          - generic [ref=e510]:
            - generic [ref=e511]: Al-Mumtahanah
            - generic [ref=e512]: She that is to be examined
          - generic [ref=e513]:
            - generic [ref=e514]: "060"
            - generic [ref=e515]: 13 Verses
        - link "61 As-Saf The Ranks 061 14 Verses" [ref=e516] [cursor=pointer]:
          - /url: /en/pages/551
          - generic [ref=e517]: "61"
          - generic [ref=e518]:
            - generic [ref=e519]: As-Saf
            - generic [ref=e520]: The Ranks
          - generic [ref=e521]:
            - generic [ref=e522]: "061"
            - generic [ref=e523]: 14 Verses
        - link "62 Al-Jumu'ah The Congregation, Friday 062 11 Verses" [ref=e524] [cursor=pointer]:
          - /url: /en/pages/553
          - generic [ref=e525]: "62"
          - generic [ref=e526]:
            - generic [ref=e527]: Al-Jumu'ah
            - generic [ref=e528]: The Congregation, Friday
          - generic [ref=e529]:
            - generic [ref=e530]: "062"
            - generic [ref=e531]: 11 Verses
        - link "63 Al-Munafiqun The Hypocrites 063 11 Verses" [ref=e532] [cursor=pointer]:
          - /url: /en/pages/554
          - generic [ref=e533]: "63"
          - generic [ref=e534]:
            - generic [ref=e535]: Al-Munafiqun
            - generic [ref=e536]: The Hypocrites
          - generic [ref=e537]:
            - generic [ref=e538]: "063"
            - generic [ref=e539]: 11 Verses
        - link "64 At-Taghabun The Mutual Disillusion 064 18 Verses" [ref=e540] [cursor=pointer]:
          - /url: /en/pages/556
          - generic [ref=e541]: "64"
          - generic [ref=e542]:
            - generic [ref=e543]: At-Taghabun
            - generic [ref=e544]: The Mutual Disillusion
          - generic [ref=e545]:
            - generic [ref=e546]: "064"
            - generic [ref=e547]: 18 Verses
        - link "65 At-Talaq The Divorce 065 12 Verses" [ref=e548] [cursor=pointer]:
          - /url: /en/pages/558
          - generic [ref=e549]: "65"
          - generic [ref=e550]:
            - generic [ref=e551]: At-Talaq
            - generic [ref=e552]: The Divorce
          - generic [ref=e553]:
            - generic [ref=e554]: "065"
            - generic [ref=e555]: 12 Verses
        - link "66 At-Tahrim The Prohibition 066 12 Verses" [ref=e556] [cursor=pointer]:
          - /url: /en/pages/560
          - generic [ref=e557]: "66"
          - generic [ref=e558]:
            - generic [ref=e559]: At-Tahrim
            - generic [ref=e560]: The Prohibition
          - generic [ref=e561]:
            - generic [ref=e562]: "066"
            - generic [ref=e563]: 12 Verses
        - link "67 Al-Mulk The Sovereignty 067 30 Verses" [ref=e564] [cursor=pointer]:
          - /url: /en/pages/562
          - generic [ref=e565]: "67"
          - generic [ref=e566]:
            - generic [ref=e567]: Al-Mulk
            - generic [ref=e568]: The Sovereignty
          - generic [ref=e569]:
            - generic [ref=e570]: "067"
            - generic [ref=e571]: 30 Verses
        - link "68 Al-Qalam The Pen 068 52 Verses" [ref=e572] [cursor=pointer]:
          - /url: /en/pages/564
          - generic [ref=e573]: "68"
          - generic [ref=e574]:
            - generic [ref=e575]: Al-Qalam
            - generic [ref=e576]: The Pen
          - generic [ref=e577]:
            - generic [ref=e578]: "068"
            - generic [ref=e579]: 52 Verses
        - link "69 Al-Haqqah The Reality 069 52 Verses" [ref=e580] [cursor=pointer]:
          - /url: /en/pages/566
          - generic [ref=e581]: "69"
          - generic [ref=e582]:
            - generic [ref=e583]: Al-Haqqah
            - generic [ref=e584]: The Reality
          - generic [ref=e585]:
            - generic [ref=e586]: "069"
            - generic [ref=e587]: 52 Verses
        - link "70 Al-Ma'arij The Ascending Stairways 070 44 Verses" [ref=e588] [cursor=pointer]:
          - /url: /en/pages/568
          - generic [ref=e589]: "70"
          - generic [ref=e590]:
            - generic [ref=e591]: Al-Ma'arij
            - generic [ref=e592]: The Ascending Stairways
          - generic [ref=e593]:
            - generic [ref=e594]: "070"
            - generic [ref=e595]: 44 Verses
        - link "71 Nuh Noah 071 28 Verses" [ref=e596] [cursor=pointer]:
          - /url: /en/pages/570
          - generic [ref=e597]: "71"
          - generic [ref=e598]:
            - generic [ref=e599]: Nuh
            - generic [ref=e600]: Noah
          - generic [ref=e601]:
            - generic [ref=e602]: "071"
            - generic [ref=e603]: 28 Verses
        - link "72 Al-Jinn The Jinn 072 28 Verses" [ref=e604] [cursor=pointer]:
          - /url: /en/pages/572
          - generic [ref=e605]: "72"
          - generic [ref=e606]:
            - generic [ref=e607]: Al-Jinn
            - generic [ref=e608]: The Jinn
          - generic [ref=e609]:
            - generic [ref=e610]: "072"
            - generic [ref=e611]: 28 Verses
        - link "73 Al-Muzzammil The Enshrouded One 073 20 Verses" [ref=e612] [cursor=pointer]:
          - /url: /en/pages/574
          - generic [ref=e613]: "73"
          - generic [ref=e614]:
            - generic [ref=e615]: Al-Muzzammil
            - generic [ref=e616]: The Enshrouded One
          - generic [ref=e617]:
            - generic [ref=e618]: "073"
            - generic [ref=e619]: 20 Verses
        - link "74 Al-Muddaththir The Cloaked One 074 56 Verses" [ref=e620] [cursor=pointer]:
          - /url: /en/pages/575
          - generic [ref=e621]: "74"
          - generic [ref=e622]:
            - generic [ref=e623]: Al-Muddaththir
            - generic [ref=e624]: The Cloaked One
          - generic [ref=e625]:
            - generic [ref=e626]: "074"
            - generic [ref=e627]: 56 Verses
        - link "75 Al-Qiyamah The Resurrection 075 40 Verses" [ref=e628] [cursor=pointer]:
          - /url: /en/pages/577
          - generic [ref=e629]: "75"
          - generic [ref=e630]:
            - generic [ref=e631]: Al-Qiyamah
            - generic [ref=e632]: The Resurrection
          - generic [ref=e633]:
            - generic [ref=e634]: "075"
            - generic [ref=e635]: 40 Verses
        - link "76 Al-Insan The Man 076 31 Verses" [ref=e636] [cursor=pointer]:
          - /url: /en/pages/578
          - generic [ref=e637]: "76"
          - generic [ref=e638]:
            - generic [ref=e639]: Al-Insan
            - generic [ref=e640]: The Man
          - generic [ref=e641]:
            - generic [ref=e642]: "076"
            - generic [ref=e643]: 31 Verses
        - link "77 Al-Mursalat The Emissaries 077 50 Verses" [ref=e644] [cursor=pointer]:
          - /url: /en/pages/580
          - generic [ref=e645]: "77"
          - generic [ref=e646]:
            - generic [ref=e647]: Al-Mursalat
            - generic [ref=e648]: The Emissaries
          - generic [ref=e649]:
            - generic [ref=e650]: "077"
            - generic [ref=e651]: 50 Verses
        - link "78 An-Naba The Tidings 078 40 Verses" [ref=e652] [cursor=pointer]:
          - /url: /en/pages/582
          - generic [ref=e653]: "78"
          - generic [ref=e654]:
            - generic [ref=e655]: An-Naba
            - generic [ref=e656]: The Tidings
          - generic [ref=e657]:
            - generic [ref=e658]: "078"
            - generic [ref=e659]: 40 Verses
        - link "79 An-Nazi'at Those who drag forth 079 46 Verses" [ref=e660] [cursor=pointer]:
          - /url: /en/pages/583
          - generic [ref=e661]: "79"
          - generic [ref=e662]:
            - generic [ref=e663]: An-Nazi'at
            - generic [ref=e664]: Those who drag forth
          - generic [ref=e665]:
            - generic [ref=e666]: "079"
            - generic [ref=e667]: 46 Verses
        - link "80 'Abasa He Frowned 080 42 Verses" [ref=e668] [cursor=pointer]:
          - /url: /en/pages/585
          - generic [ref=e669]: "80"
          - generic [ref=e670]:
            - generic [ref=e671]: "'Abasa"
            - generic [ref=e672]: He Frowned
          - generic [ref=e673]:
            - generic [ref=e674]: "080"
            - generic [ref=e675]: 42 Verses
        - link "81 At-Takwir The Overthrowing 081 29 Verses" [ref=e676] [cursor=pointer]:
          - /url: /en/pages/586
          - generic [ref=e677]: "81"
          - generic [ref=e678]:
            - generic [ref=e679]: At-Takwir
            - generic [ref=e680]: The Overthrowing
          - generic [ref=e681]:
            - generic [ref=e682]: "081"
            - generic [ref=e683]: 29 Verses
        - link "82 Al-Infitar The Cleaving 082 19 Verses" [ref=e684] [cursor=pointer]:
          - /url: /en/pages/587
          - generic [ref=e685]: "82"
          - generic [ref=e686]:
            - generic [ref=e687]: Al-Infitar
            - generic [ref=e688]: The Cleaving
          - generic [ref=e689]:
            - generic [ref=e690]: "082"
            - generic [ref=e691]: 19 Verses
        - link "83 Al-Mutaffifin The Defrauding 083 36 Verses" [ref=e692] [cursor=pointer]:
          - /url: /en/pages/587
          - generic [ref=e693]: "83"
          - generic [ref=e694]:
            - generic [ref=e695]: Al-Mutaffifin
            - generic [ref=e696]: The Defrauding
          - generic [ref=e697]:
            - generic [ref=e698]: "083"
            - generic [ref=e699]: 36 Verses
        - link "84 Al-Inshiqaq The Sundering 084 25 Verses" [ref=e700] [cursor=pointer]:
          - /url: /en/pages/589
          - generic [ref=e701]: "84"
          - generic [ref=e702]:
            - generic [ref=e703]: Al-Inshiqaq
            - generic [ref=e704]: The Sundering
          - generic [ref=e705]:
            - generic [ref=e706]: "084"
            - generic [ref=e707]: 25 Verses
        - link "85 Al-Buruj The Mansions of the Stars 085 22 Verses" [ref=e708] [cursor=pointer]:
          - /url: /en/pages/590
          - generic [ref=e709]: "85"
          - generic [ref=e710]:
            - generic [ref=e711]: Al-Buruj
            - generic [ref=e712]: The Mansions of the Stars
          - generic [ref=e713]:
            - generic [ref=e714]: "085"
            - generic [ref=e715]: 22 Verses
        - link "86 At-Tariq The Nightcommer 086 17 Verses" [ref=e716] [cursor=pointer]:
          - /url: /en/pages/591
          - generic [ref=e717]: "86"
          - generic [ref=e718]:
            - generic [ref=e719]: At-Tariq
            - generic [ref=e720]: The Nightcommer
          - generic [ref=e721]:
            - generic [ref=e722]: "086"
            - generic [ref=e723]: 17 Verses
        - link "87 Al-A'la The Most High 087 19 Verses" [ref=e724] [cursor=pointer]:
          - /url: /en/pages/591
          - generic [ref=e725]: "87"
          - generic [ref=e726]:
            - generic [ref=e727]: Al-A'la
            - generic [ref=e728]: The Most High
          - generic [ref=e729]:
            - generic [ref=e730]: "087"
            - generic [ref=e731]: 19 Verses
        - link "88 Al-Ghashiyah The Overwhelming 088 26 Verses" [ref=e732] [cursor=pointer]:
          - /url: /en/pages/592
          - generic [ref=e733]: "88"
          - generic [ref=e734]:
            - generic [ref=e735]: Al-Ghashiyah
            - generic [ref=e736]: The Overwhelming
          - generic [ref=e737]:
            - generic [ref=e738]: "088"
            - generic [ref=e739]: 26 Verses
        - link "89 Al-Fajr The Dawn 089 30 Verses" [ref=e740] [cursor=pointer]:
          - /url: /en/pages/593
          - generic [ref=e741]: "89"
          - generic [ref=e742]:
            - generic [ref=e743]: Al-Fajr
            - generic [ref=e744]: The Dawn
          - generic [ref=e745]:
            - generic [ref=e746]: "089"
            - generic [ref=e747]: 30 Verses
        - link "90 Al-Balad The City 090 20 Verses" [ref=e748] [cursor=pointer]:
          - /url: /en/pages/594
          - generic [ref=e749]: "90"
          - generic [ref=e750]:
            - generic [ref=e751]: Al-Balad
            - generic [ref=e752]: The City
          - generic [ref=e753]:
            - generic [ref=e754]: "090"
            - generic [ref=e755]: 20 Verses
        - link "91 Ash-Shams The Sun 091 15 Verses" [ref=e756] [cursor=pointer]:
          - /url: /en/pages/595
          - generic [ref=e757]: "91"
          - generic [ref=e758]:
            - generic [ref=e759]: Ash-Shams
            - generic [ref=e760]: The Sun
          - generic [ref=e761]:
            - generic [ref=e762]: "091"
            - generic [ref=e763]: 15 Verses
        - link "92 Al-Layl The Night 092 21 Verses" [ref=e764] [cursor=pointer]:
          - /url: /en/pages/595
          - generic [ref=e765]: "92"
          - generic [ref=e766]:
            - generic [ref=e767]: Al-Layl
            - generic [ref=e768]: The Night
          - generic [ref=e769]:
            - generic [ref=e770]: "092"
            - generic [ref=e771]: 21 Verses
        - link "93 Ad-Duhaa The Morning Hours 093 11 Verses" [ref=e772] [cursor=pointer]:
          - /url: /en/pages/596
          - generic [ref=e773]: "93"
          - generic [ref=e774]:
            - generic [ref=e775]: Ad-Duhaa
            - generic [ref=e776]: The Morning Hours
          - generic [ref=e777]:
            - generic [ref=e778]: "093"
            - generic [ref=e779]: 11 Verses
        - link "94 Ash-Sharh The Relief 094 8 Verses" [ref=e780] [cursor=pointer]:
          - /url: /en/pages/596
          - generic [ref=e781]: "94"
          - generic [ref=e782]:
            - generic [ref=e783]: Ash-Sharh
            - generic [ref=e784]: The Relief
          - generic [ref=e785]:
            - generic [ref=e786]: "094"
            - generic [ref=e787]: 8 Verses
        - link "95 At-Tin The Fig 095 8 Verses" [ref=e788] [cursor=pointer]:
          - /url: /en/pages/597
          - generic [ref=e789]: "95"
          - generic [ref=e790]:
            - generic [ref=e791]: At-Tin
            - generic [ref=e792]: The Fig
          - generic [ref=e793]:
            - generic [ref=e794]: "095"
            - generic [ref=e795]: 8 Verses
        - link "96 Al-'Alaq The Clot 096 19 Verses" [ref=e796] [cursor=pointer]:
          - /url: /en/pages/597
          - generic [ref=e797]: "96"
          - generic [ref=e798]:
            - generic [ref=e799]: Al-'Alaq
            - generic [ref=e800]: The Clot
          - generic [ref=e801]:
            - generic [ref=e802]: "096"
            - generic [ref=e803]: 19 Verses
        - link "97 Al-Qadr The Power 097 5 Verses" [ref=e804] [cursor=pointer]:
          - /url: /en/pages/598
          - generic [ref=e805]: "97"
          - generic [ref=e806]:
            - generic [ref=e807]: Al-Qadr
            - generic [ref=e808]: The Power
          - generic [ref=e809]:
            - generic [ref=e810]: "097"
            - generic [ref=e811]: 5 Verses
        - link "98 Al-Bayyinah The Clear Proof 098 8 Verses" [ref=e812] [cursor=pointer]:
          - /url: /en/pages/598
          - generic [ref=e813]: "98"
          - generic [ref=e814]:
            - generic [ref=e815]: Al-Bayyinah
            - generic [ref=e816]: The Clear Proof
          - generic [ref=e817]:
            - generic [ref=e818]: "098"
            - generic [ref=e819]: 8 Verses
        - link "99 Az-Zalzalah The Earthquake 099 8 Verses" [ref=e820] [cursor=pointer]:
          - /url: /en/pages/599
          - generic [ref=e821]: "99"
          - generic [ref=e822]:
            - generic [ref=e823]: Az-Zalzalah
            - generic [ref=e824]: The Earthquake
          - generic [ref=e825]:
            - generic [ref=e826]: "099"
            - generic [ref=e827]: 8 Verses
        - link "100 Al-'Adiyat The Courser 100 11 Verses" [ref=e828] [cursor=pointer]:
          - /url: /en/pages/599
          - generic [ref=e829]: "100"
          - generic [ref=e830]:
            - generic [ref=e831]: Al-'Adiyat
            - generic [ref=e832]: The Courser
          - generic [ref=e833]:
            - generic [ref=e834]: "100"
            - generic [ref=e835]: 11 Verses
        - link "101 Al-Qari'ah The Calamity 101 11 Verses" [ref=e836] [cursor=pointer]:
          - /url: /en/pages/600
          - generic [ref=e837]: "101"
          - generic [ref=e838]:
            - generic [ref=e839]: Al-Qari'ah
            - generic [ref=e840]: The Calamity
          - generic [ref=e841]:
            - generic [ref=e842]: "101"
            - generic [ref=e843]: 11 Verses
        - link "102 At-Takathur The Rivalry in world increase 102 8 Verses" [ref=e844] [cursor=pointer]:
          - /url: /en/pages/600
          - generic [ref=e845]: "102"
          - generic [ref=e846]:
            - generic [ref=e847]: At-Takathur
            - generic [ref=e848]: The Rivalry in world increase
          - generic [ref=e849]:
            - generic [ref=e850]: "102"
            - generic [ref=e851]: 8 Verses
        - link "103 Al-'Asr The Declining Day 103 3 Verses" [ref=e852] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e853]: "103"
          - generic [ref=e854]:
            - generic [ref=e855]: Al-'Asr
            - generic [ref=e856]: The Declining Day
          - generic [ref=e857]:
            - generic [ref=e858]: "103"
            - generic [ref=e859]: 3 Verses
        - link "104 Al-Humazah The Traducer 104 9 Verses" [ref=e860] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e861]: "104"
          - generic [ref=e862]:
            - generic [ref=e863]: Al-Humazah
            - generic [ref=e864]: The Traducer
          - generic [ref=e865]:
            - generic [ref=e866]: "104"
            - generic [ref=e867]: 9 Verses
        - link "105 Al-Fil The Elephant 105 5 Verses" [ref=e868] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e869]: "105"
          - generic [ref=e870]:
            - generic [ref=e871]: Al-Fil
            - generic [ref=e872]: The Elephant
          - generic [ref=e873]:
            - generic [ref=e874]: "105"
            - generic [ref=e875]: 5 Verses
        - link "106 Quraysh Quraysh 106 4 Verses" [ref=e876] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e877]: "106"
          - generic [ref=e878]:
            - generic [ref=e879]: Quraysh
            - generic [ref=e880]: Quraysh
          - generic [ref=e881]:
            - generic [ref=e882]: "106"
            - generic [ref=e883]: 4 Verses
        - link "107 Al-Ma'un The Small kindnesses 107 7 Verses" [ref=e884] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e885]: "107"
          - generic [ref=e886]:
            - generic [ref=e887]: Al-Ma'un
            - generic [ref=e888]: The Small kindnesses
          - generic [ref=e889]:
            - generic [ref=e890]: "107"
            - generic [ref=e891]: 7 Verses
        - link "108 Al-Kawthar The Abundance 108 3 Verses" [ref=e892] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e893]: "108"
          - generic [ref=e894]:
            - generic [ref=e895]: Al-Kawthar
            - generic [ref=e896]: The Abundance
          - generic [ref=e897]:
            - generic [ref=e898]: "108"
            - generic [ref=e899]: 3 Verses
        - link "109 Al-Kafirun The Disbelievers 109 6 Verses" [ref=e900] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e901]: "109"
          - generic [ref=e902]:
            - generic [ref=e903]: Al-Kafirun
            - generic [ref=e904]: The Disbelievers
          - generic [ref=e905]:
            - generic [ref=e906]: "109"
            - generic [ref=e907]: 6 Verses
        - link "110 An-Nasr The Divine Support 110 3 Verses" [ref=e908] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e909]: "110"
          - generic [ref=e910]:
            - generic [ref=e911]: An-Nasr
            - generic [ref=e912]: The Divine Support
          - generic [ref=e913]:
            - generic [ref=e914]: "110"
            - generic [ref=e915]: 3 Verses
        - link "111 Al-Masad The Palm Fiber 111 5 Verses" [ref=e916] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e917]: "111"
          - generic [ref=e918]:
            - generic [ref=e919]: Al-Masad
            - generic [ref=e920]: The Palm Fiber
          - generic [ref=e921]:
            - generic [ref=e922]: "111"
            - generic [ref=e923]: 5 Verses
        - link "112 Al-Ikhlas The Sincerity 112 4 Verses" [ref=e924] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e925]: "112"
          - generic [ref=e926]:
            - generic [ref=e927]: Al-Ikhlas
            - generic [ref=e928]: The Sincerity
          - generic [ref=e929]:
            - generic [ref=e930]: "112"
            - generic [ref=e931]: 4 Verses
        - link "113 Al-Falaq The Daybreak 113 5 Verses" [ref=e932] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e933]: "113"
          - generic [ref=e934]:
            - generic [ref=e935]: Al-Falaq
            - generic [ref=e936]: The Daybreak
          - generic [ref=e937]:
            - generic [ref=e938]: "113"
            - generic [ref=e939]: 5 Verses
        - link "114 An-Nas Mankind 114 6 Verses" [ref=e940] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e941]: "114"
          - generic [ref=e942]:
            - generic [ref=e943]: An-Nas
            - generic [ref=e944]: Mankind
          - generic [ref=e945]:
            - generic [ref=e946]: "114"
            - generic [ref=e947]: 6 Verses
  - alert [ref=e948]
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from "@playwright/test";
  2   | 
  3   | // Visual regression smoke suite — see docs/plans/visual-e2e-testing.md and
  4   | // ADR 0022. Covers 5 fixed screens x {ar, en} x {light, dark}, run against
  5   | // both the "desktop" and "mobile" Playwright projects (except the double-page
  6   | // spread, which only exists at lg+ and is skipped on "mobile").
  7   | 
  8   | type Locale = "ar" | "en";
  9   | type Theme = "light" | "dark";
  10  | 
  11  | const LOCALES: Locale[] = ["ar", "en"];
  12  | const THEMES: Theme[] = ["light", "dark"];
  13  | 
  14  | const SEARCH_PLACEHOLDER: Record<Locale, string> = {
  15  |   ar: "ابحث عن السورة بالاسم أو الرقم",
  16  |   en: "Search surah by name or number",
  17  | };
  18  | const SEARCH_QUERY: Record<Locale, string> = {
  19  |   ar: "فاتحة",
  20  |   en: "Fatihah",
  21  | };
  22  | const SETTINGS_LABEL: Record<Locale, string> = {
  23  |   ar: "الإعدادات",
  24  |   en: "Settings",
  25  | };
  26  | // The results dropdown's surah heading, which SearchQueryResults renders only
  27  | // once `chapters.length > 0` — so it cannot match before results exist. Matched
  28  | // by prefix because the count is rendered inside it as a localized numeral.
  29  | // Deliberately not a locator for the result row itself: the home page's own
  30  | // surah list renders each surah as a link with the same accessible name, so
  31  | // `getByRole("link", { name: "Al-Fatihah" })` would resolve against the list
  32  | // underneath the dropdown and pass before the search had rendered anything.
  33  | const SEARCH_RESULTS_HEADING: Record<Locale, RegExp> = {
  34  |   ar: /^السور \(/,
  35  |   en: /^Surahs \(/,
  36  | };
  37  | 
  38  | /** Sets the theme in localStorage before first paint, mirroring app/utils/storage.ts's JSON.stringify shape. */
  39  | async function withTheme(page: Page, theme: Theme) {
  40  |   await page.addInitScript((t) => {
  41  |     window.localStorage.setItem("theme", JSON.stringify(t));
  42  |   }, theme);
  43  | }
  44  | 
  45  | // Blocks until every mounted safha has painted its word rows.
  46  | //
  47  | // `toHaveScreenshot` decides a page has settled by comparing two screenshots
  48  | // 100ms apart — but it disables CSS animations first, which freezes the loading
  49  | // skeleton's `animate-pulse` and makes a half-loaded reader look like a settled
  50  | // one. Its only built-in readiness signal, `document.fonts.ready`, resolves long
  51  | // before the line content arrives (ADR 0034), so without this the captured frame
  52  | // is whichever of {skeleton, text} the runner happened to reach — measured at
  53  | // 4-in-8 runs, and the difference between the two lands right on the diff gate.
  54  | //
  55  | // This asserts content is PRESENT rather than that the skeleton is absent. A
  56  | // `no .animate-pulse` check returns an empty list — and so passes instantly —
  57  | // the moment that class is renamed, silently restoring the flake with no failing
  58  | // test to reveal it. The length guard is the same hazard one level up: `every()`
  59  | // on an empty list is vacuously true. See docs/plans/visual-e2e-testing.md
  60  | // Addendum (2026-08-02).
  61  | async function waitForReaderContent(page: Page) {
  62  |   await page.waitForFunction(() => {
  63  |     const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
  64  |     return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  65  |   });
  66  | }
  67  | 
  68  | for (const locale of LOCALES) {
  69  |   for (const theme of THEMES) {
  70  |     const suffix = `${locale}-${theme}`;
  71  | 
  72  |     test.describe(`home (${suffix})`, () => {
  73  |       test("surah list", async ({ page }) => {
  74  |         await withTheme(page, theme);
  75  |         await page.goto(`/${locale}`);
> 76  |         await expect(page).toHaveScreenshot(`home-${suffix}.png`);
      |                            ^ Error: expect(page).toHaveScreenshot(expected) failed
  77  |       });
  78  |     });
  79  | 
  80  |     test.describe(`quran page 1 (${suffix})`, () => {
  81  |       test("single page, short opening page", async ({ page }) => {
  82  |         await withTheme(page, theme);
  83  |         await page.goto(`/${locale}/pages/1`);
  84  |         await waitForReaderContent(page);
  85  |         await expect(page).toHaveScreenshot(`page-1-${suffix}.png`);
  86  |       });
  87  |     });
  88  | 
  89  |     test.describe(`quran pages 2-3 double-spread (${suffix})`, () => {
  90  |       test("double-page spread", async ({ page }, testInfo) => {
  91  |         test.skip(
  92  |           testInfo.project.name === "mobile",
  93  |           "double-page spread only renders at lg+ (ADR 0013) — nothing distinct to capture on mobile"
  94  |         );
  95  |         await withTheme(page, theme);
  96  |         await page.goto(`/${locale}/pages/2`);
  97  |         await waitForReaderContent(page);
  98  |         await expect(page).toHaveScreenshot(`spread-2-3-${suffix}.png`);
  99  |       });
  100 |     });
  101 | 
  102 |     test.describe(`search results (${suffix})`, () => {
  103 |       test("search for a chapter", async ({ page }, testInfo) => {
  104 |         await withTheme(page, theme);
  105 |         await page.goto(`/${locale}`);
  106 | 
  107 |         // Mobile opens search in a dialog while the nav's own search bar stays
  108 |         // mounted, so both render a results dropdown — every locator below has to
  109 |         // be scoped to the one under test or it hits a strict-mode violation.
  110 |         let scope: Page | Locator = page;
  111 |         if (testInfo.project.name === "mobile") {
  112 |           await page.getByRole("button", { name: SEARCH_PLACEHOLDER[locale] }).click();
  113 |           scope = page.getByRole("dialog");
  114 |         }
  115 |         await scope.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);
  116 | 
  117 |         // Positive wait on the rendered results rather than a fixed sleep: the
  118 |         // old `waitForTimeout(800)` left only ~300ms after the 500ms debounce for
  119 |         // the request and render, so the screenshot caught either the spinner or
  120 |         // the dropdown depending on timing — 2 of the 4 search snapshots differed
  121 |         // run-to-run at a ratio of ~0.05, well past the diff gate.
  122 |         await expect(scope.getByText(SEARCH_RESULTS_HEADING[locale])).toBeVisible();
  123 |         await expect(page).toHaveScreenshot(`search-${suffix}.png`);
  124 |       });
  125 |     });
  126 | 
  127 |     test.describe(`settings sheet (${suffix})`, () => {
  128 |       test("open settings sheet", async ({ page }) => {
  129 |         await withTheme(page, theme);
  130 |         await page.goto(`/${locale}`);
  131 |         await page.getByRole("button", { name: SETTINGS_LABEL[locale] }).click();
  132 |         // Sheet slide-in animation.
  133 |         await page.waitForTimeout(600);
  134 |         await expect(page).toHaveScreenshot(`settings-${suffix}.png`);
  135 |       });
  136 |     });
  137 |   }
  138 | }
  139 | 
```