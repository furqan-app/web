# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> home (ar-dark) >> surah list
- Location: e2e/tests/visual.spec.ts:73:11

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  3718 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: home-ar-dark.png

Call log:
  - Expect "toHaveScreenshot(home-ar-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 3718 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 3718 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Home" [ref=e5] [cursor=pointer]:
          - /url: /
        - link "متابعة القراءة" [ref=e6] [cursor=pointer]:
          - /url: /ar/pages/1
          - img [ref=e7]
          - generic [ref=e9]: متابعة القراءة
        - link "المصحف المشترك" [ref=e10] [cursor=pointer]:
          - /url: /ar/mushaf
          - img [ref=e11]
          - generic [ref=e16]: المصحف المشترك
        - generic [ref=e19]:
          - img
          - textbox "ابحث عن السورة بالاسم أو الرقم" [ref=e20]
        - button "الإشعارات" [ref=e21] [cursor=pointer]:
          - img
        - button "حسابي" [ref=e22] [cursor=pointer]:
          - img [ref=e24]
          - generic [ref=e27]: حسابي
        - button "الإعدادات" [ref=e28] [cursor=pointer]:
          - img
    - main [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]: احفظ القرآن الكريم
        - heading "الفرقان" [level=1] [ref=e32]
        - paragraph [ref=e33]: كلُّ كلمة أمانة، وكلُّ آية رحلة — علِّق وتأمَّل وأتقن حفظك للقرآن الكريم، خطوةً بخطوة بجانب شيخك.
      - generic [ref=e34]:
        - link "١ 001 ٧ آيات" [ref=e35] [cursor=pointer]:
          - /url: /ar/pages/1
          - generic [ref=e36]: ١
          - generic [ref=e37]:
            - generic [ref=e38]: "001"
            - generic [ref=e39]: ٧ آيات
          - img [ref=e40]
        - link "٢ 002 ٢٨٦ آية" [ref=e42] [cursor=pointer]:
          - /url: /ar/pages/2
          - generic [ref=e43]: ٢
          - generic [ref=e44]:
            - generic [ref=e45]: "002"
            - generic [ref=e46]: ٢٨٦ آية
          - img [ref=e47]
        - link "٣ 003 ٢٠٠ آية" [ref=e49] [cursor=pointer]:
          - /url: /ar/pages/50
          - generic [ref=e50]: ٣
          - generic [ref=e51]:
            - generic [ref=e52]: "003"
            - generic [ref=e53]: ٢٠٠ آية
          - img [ref=e54]
        - link "٤ 004 ١٧٦ آية" [ref=e56] [cursor=pointer]:
          - /url: /ar/pages/77
          - generic [ref=e57]: ٤
          - generic [ref=e58]:
            - generic [ref=e59]: "004"
            - generic [ref=e60]: ١٧٦ آية
          - img [ref=e61]
        - link "٥ 005 ١٢٠ آية" [ref=e63] [cursor=pointer]:
          - /url: /ar/pages/106
          - generic [ref=e64]: ٥
          - generic [ref=e65]:
            - generic [ref=e66]: "005"
            - generic [ref=e67]: ١٢٠ آية
          - img [ref=e68]
        - link "٦ 006 ١٦٥ آية" [ref=e70] [cursor=pointer]:
          - /url: /ar/pages/128
          - generic [ref=e71]: ٦
          - generic [ref=e72]:
            - generic [ref=e73]: "006"
            - generic [ref=e74]: ١٦٥ آية
          - img [ref=e75]
        - link "٧ 007 ٢٠٦ آية" [ref=e77] [cursor=pointer]:
          - /url: /ar/pages/151
          - generic [ref=e78]: ٧
          - generic [ref=e79]:
            - generic [ref=e80]: "007"
            - generic [ref=e81]: ٢٠٦ آية
          - img [ref=e82]
        - link "٨ 008 ٧٥ آية" [ref=e84] [cursor=pointer]:
          - /url: /ar/pages/177
          - generic [ref=e85]: ٨
          - generic [ref=e86]:
            - generic [ref=e87]: "008"
            - generic [ref=e88]: ٧٥ آية
          - img [ref=e89]
        - link "٩ 009 ١٢٩ آية" [ref=e91] [cursor=pointer]:
          - /url: /ar/pages/187
          - generic [ref=e92]: ٩
          - generic [ref=e93]:
            - generic [ref=e94]: "009"
            - generic [ref=e95]: ١٢٩ آية
          - img [ref=e96]
        - link "١٠ 010 ١٠٩ آية" [ref=e98] [cursor=pointer]:
          - /url: /ar/pages/208
          - generic [ref=e99]: ١٠
          - generic [ref=e100]:
            - generic [ref=e101]: "010"
            - generic [ref=e102]: ١٠٩ آية
          - img [ref=e103]
        - link "١١ 011 ١٢٣ آية" [ref=e105] [cursor=pointer]:
          - /url: /ar/pages/221
          - generic [ref=e106]: ١١
          - generic [ref=e107]:
            - generic [ref=e108]: "011"
            - generic [ref=e109]: ١٢٣ آية
          - img [ref=e110]
        - link "١٢ 012 ١١١ آية" [ref=e112] [cursor=pointer]:
          - /url: /ar/pages/235
          - generic [ref=e113]: ١٢
          - generic [ref=e114]:
            - generic [ref=e115]: "012"
            - generic [ref=e116]: ١١١ آية
          - img [ref=e117]
        - link "١٣ 013 ٤٣ آية" [ref=e119] [cursor=pointer]:
          - /url: /ar/pages/249
          - generic [ref=e120]: ١٣
          - generic [ref=e121]:
            - generic [ref=e122]: "013"
            - generic [ref=e123]: ٤٣ آية
          - img [ref=e124]
        - link "١٤ 014 ٥٢ آية" [ref=e126] [cursor=pointer]:
          - /url: /ar/pages/255
          - generic [ref=e127]: ١٤
          - generic [ref=e128]:
            - generic [ref=e129]: "014"
            - generic [ref=e130]: ٥٢ آية
          - img [ref=e131]
        - link "١٥ 015 ٩٩ آية" [ref=e133] [cursor=pointer]:
          - /url: /ar/pages/262
          - generic [ref=e134]: ١٥
          - generic [ref=e135]:
            - generic [ref=e136]: "015"
            - generic [ref=e137]: ٩٩ آية
          - img [ref=e138]
        - link "١٦ 016 ١٢٨ آية" [ref=e140] [cursor=pointer]:
          - /url: /ar/pages/267
          - generic [ref=e141]: ١٦
          - generic [ref=e142]:
            - generic [ref=e143]: "016"
            - generic [ref=e144]: ١٢٨ آية
          - img [ref=e145]
        - link "١٧ 017 ١١١ آية" [ref=e147] [cursor=pointer]:
          - /url: /ar/pages/282
          - generic [ref=e148]: ١٧
          - generic [ref=e149]:
            - generic [ref=e150]: "017"
            - generic [ref=e151]: ١١١ آية
          - img [ref=e152]
        - link "١٨ 018 ١١٠ آية" [ref=e154] [cursor=pointer]:
          - /url: /ar/pages/293
          - generic [ref=e155]: ١٨
          - generic [ref=e156]:
            - generic [ref=e157]: "018"
            - generic [ref=e158]: ١١٠ آية
          - img [ref=e159]
        - link "١٩ 019 ٩٨ آية" [ref=e161] [cursor=pointer]:
          - /url: /ar/pages/305
          - generic [ref=e162]: ١٩
          - generic [ref=e163]:
            - generic [ref=e164]: "019"
            - generic [ref=e165]: ٩٨ آية
          - img [ref=e166]
        - link "٢٠ 020 ١٣٥ آية" [ref=e168] [cursor=pointer]:
          - /url: /ar/pages/312
          - generic [ref=e169]: ٢٠
          - generic [ref=e170]:
            - generic [ref=e171]: "020"
            - generic [ref=e172]: ١٣٥ آية
          - img [ref=e173]
        - link "٢١ 021 ١١٢ آية" [ref=e175] [cursor=pointer]:
          - /url: /ar/pages/322
          - generic [ref=e176]: ٢١
          - generic [ref=e177]:
            - generic [ref=e178]: "021"
            - generic [ref=e179]: ١١٢ آية
          - img [ref=e180]
        - link "٢٢ 022 ٧٨ آية" [ref=e182] [cursor=pointer]:
          - /url: /ar/pages/332
          - generic [ref=e183]: ٢٢
          - generic [ref=e184]:
            - generic [ref=e185]: "022"
            - generic [ref=e186]: ٧٨ آية
          - img [ref=e187]
        - link "٢٣ 023 ١١٨ آية" [ref=e189] [cursor=pointer]:
          - /url: /ar/pages/342
          - generic [ref=e190]: ٢٣
          - generic [ref=e191]:
            - generic [ref=e192]: "023"
            - generic [ref=e193]: ١١٨ آية
          - img [ref=e194]
        - link "٢٤ 024 ٦٤ آية" [ref=e196] [cursor=pointer]:
          - /url: /ar/pages/350
          - generic [ref=e197]: ٢٤
          - generic [ref=e198]:
            - generic [ref=e199]: "024"
            - generic [ref=e200]: ٦٤ آية
          - img [ref=e201]
        - link "٢٥ 025 ٧٧ آية" [ref=e203] [cursor=pointer]:
          - /url: /ar/pages/359
          - generic [ref=e204]: ٢٥
          - generic [ref=e205]:
            - generic [ref=e206]: "025"
            - generic [ref=e207]: ٧٧ آية
          - img [ref=e208]
        - link "٢٦ 026 ٢٢٧ آية" [ref=e210] [cursor=pointer]:
          - /url: /ar/pages/367
          - generic [ref=e211]: ٢٦
          - generic [ref=e212]:
            - generic [ref=e213]: "026"
            - generic [ref=e214]: ٢٢٧ آية
          - img [ref=e215]
        - link "٢٧ 027 ٩٣ آية" [ref=e217] [cursor=pointer]:
          - /url: /ar/pages/377
          - generic [ref=e218]: ٢٧
          - generic [ref=e219]:
            - generic [ref=e220]: "027"
            - generic [ref=e221]: ٩٣ آية
          - img [ref=e222]
        - link "٢٨ 028 ٨٨ آية" [ref=e224] [cursor=pointer]:
          - /url: /ar/pages/385
          - generic [ref=e225]: ٢٨
          - generic [ref=e226]:
            - generic [ref=e227]: "028"
            - generic [ref=e228]: ٨٨ آية
          - img [ref=e229]
        - link "٢٩ 029 ٦٩ آية" [ref=e231] [cursor=pointer]:
          - /url: /ar/pages/396
          - generic [ref=e232]: ٢٩
          - generic [ref=e233]:
            - generic [ref=e234]: "029"
            - generic [ref=e235]: ٦٩ آية
          - img [ref=e236]
        - link "٣٠ 030 ٦٠ آية" [ref=e238] [cursor=pointer]:
          - /url: /ar/pages/404
          - generic [ref=e239]: ٣٠
          - generic [ref=e240]:
            - generic [ref=e241]: "030"
            - generic [ref=e242]: ٦٠ آية
          - img [ref=e243]
        - link "٣١ 031 ٣٤ آية" [ref=e245] [cursor=pointer]:
          - /url: /ar/pages/411
          - generic [ref=e246]: ٣١
          - generic [ref=e247]:
            - generic [ref=e248]: "031"
            - generic [ref=e249]: ٣٤ آية
          - img [ref=e250]
        - link "٣٢ 032 ٣٠ آية" [ref=e252] [cursor=pointer]:
          - /url: /ar/pages/415
          - generic [ref=e253]: ٣٢
          - generic [ref=e254]:
            - generic [ref=e255]: "032"
            - generic [ref=e256]: ٣٠ آية
          - img [ref=e257]
        - link "٣٣ 033 ٧٣ آية" [ref=e259] [cursor=pointer]:
          - /url: /ar/pages/418
          - generic [ref=e260]: ٣٣
          - generic [ref=e261]:
            - generic [ref=e262]: "033"
            - generic [ref=e263]: ٧٣ آية
          - img [ref=e264]
        - link "٣٤ 034 ٥٤ آية" [ref=e266] [cursor=pointer]:
          - /url: /ar/pages/428
          - generic [ref=e267]: ٣٤
          - generic [ref=e268]:
            - generic [ref=e269]: "034"
            - generic [ref=e270]: ٥٤ آية
          - img [ref=e271]
        - link "٣٥ 035 ٤٥ آية" [ref=e273] [cursor=pointer]:
          - /url: /ar/pages/434
          - generic [ref=e274]: ٣٥
          - generic [ref=e275]:
            - generic [ref=e276]: "035"
            - generic [ref=e277]: ٤٥ آية
          - img [ref=e278]
        - link "٣٦ 036 ٨٣ آية" [ref=e280] [cursor=pointer]:
          - /url: /ar/pages/440
          - generic [ref=e281]: ٣٦
          - generic [ref=e282]:
            - generic [ref=e283]: "036"
            - generic [ref=e284]: ٨٣ آية
          - img [ref=e285]
        - link "٣٧ 037 ١٨٢ آية" [ref=e287] [cursor=pointer]:
          - /url: /ar/pages/446
          - generic [ref=e288]: ٣٧
          - generic [ref=e289]:
            - generic [ref=e290]: "037"
            - generic [ref=e291]: ١٨٢ آية
          - img [ref=e292]
        - link "٣٨ 038 ٨٨ آية" [ref=e294] [cursor=pointer]:
          - /url: /ar/pages/453
          - generic [ref=e295]: ٣٨
          - generic [ref=e296]:
            - generic [ref=e297]: "038"
            - generic [ref=e298]: ٨٨ آية
          - img [ref=e299]
        - link "٣٩ 039 ٧٥ آية" [ref=e301] [cursor=pointer]:
          - /url: /ar/pages/458
          - generic [ref=e302]: ٣٩
          - generic [ref=e303]:
            - generic [ref=e304]: "039"
            - generic [ref=e305]: ٧٥ آية
          - img [ref=e306]
        - link "٤٠ 040 ٨٥ آية" [ref=e308] [cursor=pointer]:
          - /url: /ar/pages/467
          - generic [ref=e309]: ٤٠
          - generic [ref=e310]:
            - generic [ref=e311]: "040"
            - generic [ref=e312]: ٨٥ آية
          - img [ref=e313]
        - link "٤١ 041 ٥٤ آية" [ref=e315] [cursor=pointer]:
          - /url: /ar/pages/477
          - generic [ref=e316]: ٤١
          - generic [ref=e317]:
            - generic [ref=e318]: "041"
            - generic [ref=e319]: ٥٤ آية
          - img [ref=e320]
        - link "٤٢ 042 ٥٣ آية" [ref=e322] [cursor=pointer]:
          - /url: /ar/pages/483
          - generic [ref=e323]: ٤٢
          - generic [ref=e324]:
            - generic [ref=e325]: "042"
            - generic [ref=e326]: ٥٣ آية
          - img [ref=e327]
        - link "٤٣ 043 ٨٩ آية" [ref=e329] [cursor=pointer]:
          - /url: /ar/pages/489
          - generic [ref=e330]: ٤٣
          - generic [ref=e331]:
            - generic [ref=e332]: "043"
            - generic [ref=e333]: ٨٩ آية
          - img [ref=e334]
        - link "٤٤ 044 ٥٩ آية" [ref=e336] [cursor=pointer]:
          - /url: /ar/pages/496
          - generic [ref=e337]: ٤٤
          - generic [ref=e338]:
            - generic [ref=e339]: "044"
            - generic [ref=e340]: ٥٩ آية
          - img [ref=e341]
        - link "٤٥ 045 ٣٧ آية" [ref=e343] [cursor=pointer]:
          - /url: /ar/pages/499
          - generic [ref=e344]: ٤٥
          - generic [ref=e345]:
            - generic [ref=e346]: "045"
            - generic [ref=e347]: ٣٧ آية
          - img [ref=e348]
        - link "٤٦ 046 ٣٥ آية" [ref=e350] [cursor=pointer]:
          - /url: /ar/pages/502
          - generic [ref=e351]: ٤٦
          - generic [ref=e352]:
            - generic [ref=e353]: "046"
            - generic [ref=e354]: ٣٥ آية
          - img [ref=e355]
        - link "٤٧ 047 ٣٨ آية" [ref=e357] [cursor=pointer]:
          - /url: /ar/pages/507
          - generic [ref=e358]: ٤٧
          - generic [ref=e359]:
            - generic [ref=e360]: "047"
            - generic [ref=e361]: ٣٨ آية
          - img [ref=e362]
        - link "٤٨ 048 ٢٩ آية" [ref=e364] [cursor=pointer]:
          - /url: /ar/pages/511
          - generic [ref=e365]: ٤٨
          - generic [ref=e366]:
            - generic [ref=e367]: "048"
            - generic [ref=e368]: ٢٩ آية
          - img [ref=e369]
        - link "٤٩ 049 ١٨ آية" [ref=e371] [cursor=pointer]:
          - /url: /ar/pages/515
          - generic [ref=e372]: ٤٩
          - generic [ref=e373]:
            - generic [ref=e374]: "049"
            - generic [ref=e375]: ١٨ آية
          - img [ref=e376]
        - link "٥٠ 050 ٤٥ آية" [ref=e378] [cursor=pointer]:
          - /url: /ar/pages/518
          - generic [ref=e379]: ٥٠
          - generic [ref=e380]:
            - generic [ref=e381]: "050"
            - generic [ref=e382]: ٤٥ آية
          - img [ref=e383]
        - link "٥١ 051 ٦٠ آية" [ref=e385] [cursor=pointer]:
          - /url: /ar/pages/520
          - generic [ref=e386]: ٥١
          - generic [ref=e387]:
            - generic [ref=e388]: "051"
            - generic [ref=e389]: ٦٠ آية
          - img [ref=e390]
        - link "٥٢ 052 ٤٩ آية" [ref=e392] [cursor=pointer]:
          - /url: /ar/pages/523
          - generic [ref=e393]: ٥٢
          - generic [ref=e394]:
            - generic [ref=e395]: "052"
            - generic [ref=e396]: ٤٩ آية
          - img [ref=e397]
        - link "٥٣ 053 ٦٢ آية" [ref=e399] [cursor=pointer]:
          - /url: /ar/pages/526
          - generic [ref=e400]: ٥٣
          - generic [ref=e401]:
            - generic [ref=e402]: "053"
            - generic [ref=e403]: ٦٢ آية
          - img [ref=e404]
        - link "٥٤ 054 ٥٥ آية" [ref=e406] [cursor=pointer]:
          - /url: /ar/pages/528
          - generic [ref=e407]: ٥٤
          - generic [ref=e408]:
            - generic [ref=e409]: "054"
            - generic [ref=e410]: ٥٥ آية
          - img [ref=e411]
        - link "٥٥ 055 ٧٨ آية" [ref=e413] [cursor=pointer]:
          - /url: /ar/pages/531
          - generic [ref=e414]: ٥٥
          - generic [ref=e415]:
            - generic [ref=e416]: "055"
            - generic [ref=e417]: ٧٨ آية
          - img [ref=e418]
        - link "٥٦ 056 ٩٦ آية" [ref=e420] [cursor=pointer]:
          - /url: /ar/pages/534
          - generic [ref=e421]: ٥٦
          - generic [ref=e422]:
            - generic [ref=e423]: "056"
            - generic [ref=e424]: ٩٦ آية
          - img [ref=e425]
        - link "٥٧ 057 ٢٩ آية" [ref=e427] [cursor=pointer]:
          - /url: /ar/pages/537
          - generic [ref=e428]: ٥٧
          - generic [ref=e429]:
            - generic [ref=e430]: "057"
            - generic [ref=e431]: ٢٩ آية
          - img [ref=e432]
        - link "٥٨ 058 ٢٢ آية" [ref=e434] [cursor=pointer]:
          - /url: /ar/pages/542
          - generic [ref=e435]: ٥٨
          - generic [ref=e436]:
            - generic [ref=e437]: "058"
            - generic [ref=e438]: ٢٢ آية
          - img [ref=e439]
        - link "٥٩ 059 ٢٤ آية" [ref=e441] [cursor=pointer]:
          - /url: /ar/pages/545
          - generic [ref=e442]: ٥٩
          - generic [ref=e443]:
            - generic [ref=e444]: "059"
            - generic [ref=e445]: ٢٤ آية
          - img [ref=e446]
        - link "٦٠ 060 ١٣ آية" [ref=e448] [cursor=pointer]:
          - /url: /ar/pages/549
          - generic [ref=e449]: ٦٠
          - generic [ref=e450]:
            - generic [ref=e451]: "060"
            - generic [ref=e452]: ١٣ آية
          - img [ref=e453]
        - link "٦١ 061 ١٤ آية" [ref=e455] [cursor=pointer]:
          - /url: /ar/pages/551
          - generic [ref=e456]: ٦١
          - generic [ref=e457]:
            - generic [ref=e458]: "061"
            - generic [ref=e459]: ١٤ آية
          - img [ref=e460]
        - link "٦٢ 062 ١١ آية" [ref=e462] [cursor=pointer]:
          - /url: /ar/pages/553
          - generic [ref=e463]: ٦٢
          - generic [ref=e464]:
            - generic [ref=e465]: "062"
            - generic [ref=e466]: ١١ آية
          - img [ref=e467]
        - link "٦٣ 063 ١١ آية" [ref=e469] [cursor=pointer]:
          - /url: /ar/pages/554
          - generic [ref=e470]: ٦٣
          - generic [ref=e471]:
            - generic [ref=e472]: "063"
            - generic [ref=e473]: ١١ آية
          - img [ref=e474]
        - link "٦٤ 064 ١٨ آية" [ref=e476] [cursor=pointer]:
          - /url: /ar/pages/556
          - generic [ref=e477]: ٦٤
          - generic [ref=e478]:
            - generic [ref=e479]: "064"
            - generic [ref=e480]: ١٨ آية
          - img [ref=e481]
        - link "٦٥ 065 ١٢ آية" [ref=e483] [cursor=pointer]:
          - /url: /ar/pages/558
          - generic [ref=e484]: ٦٥
          - generic [ref=e485]:
            - generic [ref=e486]: "065"
            - generic [ref=e487]: ١٢ آية
          - img [ref=e488]
        - link "٦٦ 066 ١٢ آية" [ref=e490] [cursor=pointer]:
          - /url: /ar/pages/560
          - generic [ref=e491]: ٦٦
          - generic [ref=e492]:
            - generic [ref=e493]: "066"
            - generic [ref=e494]: ١٢ آية
          - img [ref=e495]
        - link "٦٧ 067 ٣٠ آية" [ref=e497] [cursor=pointer]:
          - /url: /ar/pages/562
          - generic [ref=e498]: ٦٧
          - generic [ref=e499]:
            - generic [ref=e500]: "067"
            - generic [ref=e501]: ٣٠ آية
          - img [ref=e502]
        - link "٦٨ 068 ٥٢ آية" [ref=e504] [cursor=pointer]:
          - /url: /ar/pages/564
          - generic [ref=e505]: ٦٨
          - generic [ref=e506]:
            - generic [ref=e507]: "068"
            - generic [ref=e508]: ٥٢ آية
          - img [ref=e509]
        - link "٦٩ 069 ٥٢ آية" [ref=e511] [cursor=pointer]:
          - /url: /ar/pages/566
          - generic [ref=e512]: ٦٩
          - generic [ref=e513]:
            - generic [ref=e514]: "069"
            - generic [ref=e515]: ٥٢ آية
          - img [ref=e516]
        - link "٧٠ 070 ٤٤ آية" [ref=e518] [cursor=pointer]:
          - /url: /ar/pages/568
          - generic [ref=e519]: ٧٠
          - generic [ref=e520]:
            - generic [ref=e521]: "070"
            - generic [ref=e522]: ٤٤ آية
          - img [ref=e523]
        - link "٧١ 071 ٢٨ آية" [ref=e525] [cursor=pointer]:
          - /url: /ar/pages/570
          - generic [ref=e526]: ٧١
          - generic [ref=e527]:
            - generic [ref=e528]: "071"
            - generic [ref=e529]: ٢٨ آية
          - img [ref=e530]
        - link "٧٢ 072 ٢٨ آية" [ref=e532] [cursor=pointer]:
          - /url: /ar/pages/572
          - generic [ref=e533]: ٧٢
          - generic [ref=e534]:
            - generic [ref=e535]: "072"
            - generic [ref=e536]: ٢٨ آية
          - img [ref=e537]
        - link "٧٣ 073 ٢٠ آية" [ref=e539] [cursor=pointer]:
          - /url: /ar/pages/574
          - generic [ref=e540]: ٧٣
          - generic [ref=e541]:
            - generic [ref=e542]: "073"
            - generic [ref=e543]: ٢٠ آية
          - img [ref=e544]
        - link "٧٤ 074 ٥٦ آية" [ref=e546] [cursor=pointer]:
          - /url: /ar/pages/575
          - generic [ref=e547]: ٧٤
          - generic [ref=e548]:
            - generic [ref=e549]: "074"
            - generic [ref=e550]: ٥٦ آية
          - img [ref=e551]
        - link "٧٥ 075 ٤٠ آية" [ref=e553] [cursor=pointer]:
          - /url: /ar/pages/577
          - generic [ref=e554]: ٧٥
          - generic [ref=e555]:
            - generic [ref=e556]: "075"
            - generic [ref=e557]: ٤٠ آية
          - img [ref=e558]
        - link "٧٦ 076 ٣١ آية" [ref=e560] [cursor=pointer]:
          - /url: /ar/pages/578
          - generic [ref=e561]: ٧٦
          - generic [ref=e562]:
            - generic [ref=e563]: "076"
            - generic [ref=e564]: ٣١ آية
          - img [ref=e565]
        - link "٧٧ 077 ٥٠ آية" [ref=e567] [cursor=pointer]:
          - /url: /ar/pages/580
          - generic [ref=e568]: ٧٧
          - generic [ref=e569]:
            - generic [ref=e570]: "077"
            - generic [ref=e571]: ٥٠ آية
          - img [ref=e572]
        - link "٧٨ 078 ٤٠ آية" [ref=e574] [cursor=pointer]:
          - /url: /ar/pages/582
          - generic [ref=e575]: ٧٨
          - generic [ref=e576]:
            - generic [ref=e577]: "078"
            - generic [ref=e578]: ٤٠ آية
          - img [ref=e579]
        - link "٧٩ 079 ٤٦ آية" [ref=e581] [cursor=pointer]:
          - /url: /ar/pages/583
          - generic [ref=e582]: ٧٩
          - generic [ref=e583]:
            - generic [ref=e584]: "079"
            - generic [ref=e585]: ٤٦ آية
          - img [ref=e586]
        - link "٨٠ 080 ٤٢ آية" [ref=e588] [cursor=pointer]:
          - /url: /ar/pages/585
          - generic [ref=e589]: ٨٠
          - generic [ref=e590]:
            - generic [ref=e591]: "080"
            - generic [ref=e592]: ٤٢ آية
          - img [ref=e593]
        - link "٨١ 081 ٢٩ آية" [ref=e595] [cursor=pointer]:
          - /url: /ar/pages/586
          - generic [ref=e596]: ٨١
          - generic [ref=e597]:
            - generic [ref=e598]: "081"
            - generic [ref=e599]: ٢٩ آية
          - img [ref=e600]
        - link "٨٢ 082 ١٩ آية" [ref=e602] [cursor=pointer]:
          - /url: /ar/pages/587
          - generic [ref=e603]: ٨٢
          - generic [ref=e604]:
            - generic [ref=e605]: "082"
            - generic [ref=e606]: ١٩ آية
          - img [ref=e607]
        - link "٨٣ 083 ٣٦ آية" [ref=e609] [cursor=pointer]:
          - /url: /ar/pages/587
          - generic [ref=e610]: ٨٣
          - generic [ref=e611]:
            - generic [ref=e612]: "083"
            - generic [ref=e613]: ٣٦ آية
          - img [ref=e614]
        - link "٨٤ 084 ٢٥ آية" [ref=e616] [cursor=pointer]:
          - /url: /ar/pages/589
          - generic [ref=e617]: ٨٤
          - generic [ref=e618]:
            - generic [ref=e619]: "084"
            - generic [ref=e620]: ٢٥ آية
          - img [ref=e621]
        - link "٨٥ 085 ٢٢ آية" [ref=e623] [cursor=pointer]:
          - /url: /ar/pages/590
          - generic [ref=e624]: ٨٥
          - generic [ref=e625]:
            - generic [ref=e626]: "085"
            - generic [ref=e627]: ٢٢ آية
          - img [ref=e628]
        - link "٨٦ 086 ١٧ آية" [ref=e630] [cursor=pointer]:
          - /url: /ar/pages/591
          - generic [ref=e631]: ٨٦
          - generic [ref=e632]:
            - generic [ref=e633]: "086"
            - generic [ref=e634]: ١٧ آية
          - img [ref=e635]
        - link "٨٧ 087 ١٩ آية" [ref=e637] [cursor=pointer]:
          - /url: /ar/pages/591
          - generic [ref=e638]: ٨٧
          - generic [ref=e639]:
            - generic [ref=e640]: "087"
            - generic [ref=e641]: ١٩ آية
          - img [ref=e642]
        - link "٨٨ 088 ٢٦ آية" [ref=e644] [cursor=pointer]:
          - /url: /ar/pages/592
          - generic [ref=e645]: ٨٨
          - generic [ref=e646]:
            - generic [ref=e647]: "088"
            - generic [ref=e648]: ٢٦ آية
          - img [ref=e649]
        - link "٨٩ 089 ٣٠ آية" [ref=e651] [cursor=pointer]:
          - /url: /ar/pages/593
          - generic [ref=e652]: ٨٩
          - generic [ref=e653]:
            - generic [ref=e654]: "089"
            - generic [ref=e655]: ٣٠ آية
          - img [ref=e656]
        - link "٩٠ 090 ٢٠ آية" [ref=e658] [cursor=pointer]:
          - /url: /ar/pages/594
          - generic [ref=e659]: ٩٠
          - generic [ref=e660]:
            - generic [ref=e661]: "090"
            - generic [ref=e662]: ٢٠ آية
          - img [ref=e663]
        - link "٩١ 091 ١٥ آية" [ref=e665] [cursor=pointer]:
          - /url: /ar/pages/595
          - generic [ref=e666]: ٩١
          - generic [ref=e667]:
            - generic [ref=e668]: "091"
            - generic [ref=e669]: ١٥ آية
          - img [ref=e670]
        - link "٩٢ 092 ٢١ آية" [ref=e672] [cursor=pointer]:
          - /url: /ar/pages/595
          - generic [ref=e673]: ٩٢
          - generic [ref=e674]:
            - generic [ref=e675]: "092"
            - generic [ref=e676]: ٢١ آية
          - img [ref=e677]
        - link "٩٣ 093 ١١ آية" [ref=e679] [cursor=pointer]:
          - /url: /ar/pages/596
          - generic [ref=e680]: ٩٣
          - generic [ref=e681]:
            - generic [ref=e682]: "093"
            - generic [ref=e683]: ١١ آية
          - img [ref=e684]
        - link "٩٤ 094 ٨ آيات" [ref=e686] [cursor=pointer]:
          - /url: /ar/pages/596
          - generic [ref=e687]: ٩٤
          - generic [ref=e688]:
            - generic [ref=e689]: "094"
            - generic [ref=e690]: ٨ آيات
          - img [ref=e691]
        - link "٩٥ 095 ٨ آيات" [ref=e693] [cursor=pointer]:
          - /url: /ar/pages/597
          - generic [ref=e694]: ٩٥
          - generic [ref=e695]:
            - generic [ref=e696]: "095"
            - generic [ref=e697]: ٨ آيات
          - img [ref=e698]
        - link "٩٦ 096 ١٩ آية" [ref=e700] [cursor=pointer]:
          - /url: /ar/pages/597
          - generic [ref=e701]: ٩٦
          - generic [ref=e702]:
            - generic [ref=e703]: "096"
            - generic [ref=e704]: ١٩ آية
          - img [ref=e705]
        - link "٩٧ 097 ٥ آيات" [ref=e707] [cursor=pointer]:
          - /url: /ar/pages/598
          - generic [ref=e708]: ٩٧
          - generic [ref=e709]:
            - generic [ref=e710]: "097"
            - generic [ref=e711]: ٥ آيات
          - img [ref=e712]
        - link "٩٨ 098 ٨ آيات" [ref=e714] [cursor=pointer]:
          - /url: /ar/pages/598
          - generic [ref=e715]: ٩٨
          - generic [ref=e716]:
            - generic [ref=e717]: "098"
            - generic [ref=e718]: ٨ آيات
          - img [ref=e719]
        - link "٩٩ 099 ٨ آيات" [ref=e721] [cursor=pointer]:
          - /url: /ar/pages/599
          - generic [ref=e722]: ٩٩
          - generic [ref=e723]:
            - generic [ref=e724]: "099"
            - generic [ref=e725]: ٨ آيات
          - img [ref=e726]
        - link "١٠٠ 100 ١١ آية" [ref=e728] [cursor=pointer]:
          - /url: /ar/pages/599
          - generic [ref=e729]: ١٠٠
          - generic [ref=e730]:
            - generic [ref=e731]: "100"
            - generic [ref=e732]: ١١ آية
          - img [ref=e733]
        - link "١٠١ 101 ١١ آية" [ref=e735] [cursor=pointer]:
          - /url: /ar/pages/600
          - generic [ref=e736]: ١٠١
          - generic [ref=e737]:
            - generic [ref=e738]: "101"
            - generic [ref=e739]: ١١ آية
          - img [ref=e740]
        - link "١٠٢ 102 ٨ آيات" [ref=e742] [cursor=pointer]:
          - /url: /ar/pages/600
          - generic [ref=e743]: ١٠٢
          - generic [ref=e744]:
            - generic [ref=e745]: "102"
            - generic [ref=e746]: ٨ آيات
          - img [ref=e747]
        - link "١٠٣ 103 ٣ آيات" [ref=e749] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e750]: ١٠٣
          - generic [ref=e751]:
            - generic [ref=e752]: "103"
            - generic [ref=e753]: ٣ آيات
          - img [ref=e754]
        - link "١٠٤ 104 ٩ آيات" [ref=e756] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e757]: ١٠٤
          - generic [ref=e758]:
            - generic [ref=e759]: "104"
            - generic [ref=e760]: ٩ آيات
          - img [ref=e761]
        - link "١٠٥ 105 ٥ آيات" [ref=e763] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e764]: ١٠٥
          - generic [ref=e765]:
            - generic [ref=e766]: "105"
            - generic [ref=e767]: ٥ آيات
          - img [ref=e768]
        - link "١٠٦ 106 ٤ آيات" [ref=e770] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e771]: ١٠٦
          - generic [ref=e772]:
            - generic [ref=e773]: "106"
            - generic [ref=e774]: ٤ آيات
          - img [ref=e775]
        - link "١٠٧ 107 ٧ آيات" [ref=e777] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e778]: ١٠٧
          - generic [ref=e779]:
            - generic [ref=e780]: "107"
            - generic [ref=e781]: ٧ آيات
          - img [ref=e782]
        - link "١٠٨ 108 ٣ آيات" [ref=e784] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e785]: ١٠٨
          - generic [ref=e786]:
            - generic [ref=e787]: "108"
            - generic [ref=e788]: ٣ آيات
          - img [ref=e789]
        - link "١٠٩ 109 ٦ آيات" [ref=e791] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e792]: ١٠٩
          - generic [ref=e793]:
            - generic [ref=e794]: "109"
            - generic [ref=e795]: ٦ آيات
          - img [ref=e796]
        - link "١١٠ 110 ٣ آيات" [ref=e798] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e799]: ١١٠
          - generic [ref=e800]:
            - generic [ref=e801]: "110"
            - generic [ref=e802]: ٣ آيات
          - img [ref=e803]
        - link "١١١ 111 ٥ آيات" [ref=e805] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e806]: ١١١
          - generic [ref=e807]:
            - generic [ref=e808]: "111"
            - generic [ref=e809]: ٥ آيات
          - img [ref=e810]
        - link "١١٢ 112 ٤ آيات" [ref=e812] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e813]: ١١٢
          - generic [ref=e814]:
            - generic [ref=e815]: "112"
            - generic [ref=e816]: ٤ آيات
          - img [ref=e817]
        - link "١١٣ 113 ٥ آيات" [ref=e819] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e820]: ١١٣
          - generic [ref=e821]:
            - generic [ref=e822]: "113"
            - generic [ref=e823]: ٥ آيات
          - img [ref=e824]
        - link "١١٤ 114 ٦ آيات" [ref=e826] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e827]: ١١٤
          - generic [ref=e828]:
            - generic [ref=e829]: "114"
            - generic [ref=e830]: ٦ آيات
          - img [ref=e831]
  - alert [ref=e833]
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