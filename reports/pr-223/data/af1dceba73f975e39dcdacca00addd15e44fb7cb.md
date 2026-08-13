# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> home (ar-dark) >> surah list
- Location: e2e/tests/visual.spec.ts:80:11

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  13277 pixels (ratio 0.05 of all image pixels) are different.

  Snapshot: home-ar-dark.png

Call log:
  - Expect "toHaveScreenshot(home-ar-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 13277 pixels (ratio 0.05 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 13277 pixels (ratio 0.05 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Home" [ref=e5] [cursor=pointer]:
          - /url: /
        - link [ref=e6] [cursor=pointer]:
          - /url: /ar/pages/1
          - img [ref=e7]
        - button "ابحث عن السورة بالاسم أو الرقم" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
        - button "المزيد" [ref=e14] [cursor=pointer]:
          - img
    - main [ref=e15]:
      - generic [ref=e16]:
        - heading "الفرقان" [level=1] [ref=e17]
        - paragraph [ref=e18]: كلُّ كلمة أمانة، وكلُّ آية رحلة — علِّق وتأمَّل وأتقن حفظك للقرآن الكريم، خطوةً بخطوة بجانب شيخك.
      - generic [ref=e19]:
        - link "١ 001 ٧ آيات" [ref=e20] [cursor=pointer]:
          - /url: /ar/pages/1
          - generic [ref=e21]: ١
          - generic [ref=e22]:
            - generic [ref=e23]: "001"
            - generic [ref=e24]: ٧ آيات
          - img [ref=e25]
        - link "٢ 002 ٢٨٦ آية" [ref=e27] [cursor=pointer]:
          - /url: /ar/pages/2
          - generic [ref=e28]: ٢
          - generic [ref=e29]:
            - generic [ref=e30]: "002"
            - generic [ref=e31]: ٢٨٦ آية
          - img [ref=e32]
        - link "٣ 003 ٢٠٠ آية" [ref=e34] [cursor=pointer]:
          - /url: /ar/pages/50
          - generic [ref=e35]: ٣
          - generic [ref=e36]:
            - generic [ref=e37]: "003"
            - generic [ref=e38]: ٢٠٠ آية
          - img [ref=e39]
        - link "٤ 004 ١٧٦ آية" [ref=e41] [cursor=pointer]:
          - /url: /ar/pages/77
          - generic [ref=e42]: ٤
          - generic [ref=e43]:
            - generic [ref=e44]: "004"
            - generic [ref=e45]: ١٧٦ آية
          - img [ref=e46]
        - link "٥ 005 ١٢٠ آية" [ref=e48] [cursor=pointer]:
          - /url: /ar/pages/106
          - generic [ref=e49]: ٥
          - generic [ref=e50]:
            - generic [ref=e51]: "005"
            - generic [ref=e52]: ١٢٠ آية
          - img [ref=e53]
        - link "٦ 006 ١٦٥ آية" [ref=e55] [cursor=pointer]:
          - /url: /ar/pages/128
          - generic [ref=e56]: ٦
          - generic [ref=e57]:
            - generic [ref=e58]: "006"
            - generic [ref=e59]: ١٦٥ آية
          - img [ref=e60]
        - link "٧ 007 ٢٠٦ آية" [ref=e62] [cursor=pointer]:
          - /url: /ar/pages/151
          - generic [ref=e63]: ٧
          - generic [ref=e64]:
            - generic [ref=e65]: "007"
            - generic [ref=e66]: ٢٠٦ آية
          - img [ref=e67]
        - link "٨ 008 ٧٥ آية" [ref=e69] [cursor=pointer]:
          - /url: /ar/pages/177
          - generic [ref=e70]: ٨
          - generic [ref=e71]:
            - generic [ref=e72]: "008"
            - generic [ref=e73]: ٧٥ آية
          - img [ref=e74]
        - link "٩ 009 ١٢٩ آية" [ref=e76] [cursor=pointer]:
          - /url: /ar/pages/187
          - generic [ref=e77]: ٩
          - generic [ref=e78]:
            - generic [ref=e79]: "009"
            - generic [ref=e80]: ١٢٩ آية
          - img [ref=e81]
        - link "١٠ 010 ١٠٩ آية" [ref=e83] [cursor=pointer]:
          - /url: /ar/pages/208
          - generic [ref=e84]: ١٠
          - generic [ref=e85]:
            - generic [ref=e86]: "010"
            - generic [ref=e87]: ١٠٩ آية
          - img [ref=e88]
        - link "١١ 011 ١٢٣ آية" [ref=e90] [cursor=pointer]:
          - /url: /ar/pages/221
          - generic [ref=e91]: ١١
          - generic [ref=e92]:
            - generic [ref=e93]: "011"
            - generic [ref=e94]: ١٢٣ آية
          - img [ref=e95]
        - link "١٢ 012 ١١١ آية" [ref=e97] [cursor=pointer]:
          - /url: /ar/pages/235
          - generic [ref=e98]: ١٢
          - generic [ref=e99]:
            - generic [ref=e100]: "012"
            - generic [ref=e101]: ١١١ آية
          - img [ref=e102]
        - link "١٣ 013 ٤٣ آية" [ref=e104] [cursor=pointer]:
          - /url: /ar/pages/249
          - generic [ref=e105]: ١٣
          - generic [ref=e106]:
            - generic [ref=e107]: "013"
            - generic [ref=e108]: ٤٣ آية
          - img [ref=e109]
        - link "١٤ 014 ٥٢ آية" [ref=e111] [cursor=pointer]:
          - /url: /ar/pages/255
          - generic [ref=e112]: ١٤
          - generic [ref=e113]:
            - generic [ref=e114]: "014"
            - generic [ref=e115]: ٥٢ آية
          - img [ref=e116]
        - link "١٥ 015 ٩٩ آية" [ref=e118] [cursor=pointer]:
          - /url: /ar/pages/262
          - generic [ref=e119]: ١٥
          - generic [ref=e120]:
            - generic [ref=e121]: "015"
            - generic [ref=e122]: ٩٩ آية
          - img [ref=e123]
        - link "١٦ 016 ١٢٨ آية" [ref=e125] [cursor=pointer]:
          - /url: /ar/pages/267
          - generic [ref=e126]: ١٦
          - generic [ref=e127]:
            - generic [ref=e128]: "016"
            - generic [ref=e129]: ١٢٨ آية
          - img [ref=e130]
        - link "١٧ 017 ١١١ آية" [ref=e132] [cursor=pointer]:
          - /url: /ar/pages/282
          - generic [ref=e133]: ١٧
          - generic [ref=e134]:
            - generic [ref=e135]: "017"
            - generic [ref=e136]: ١١١ آية
          - img [ref=e137]
        - link "١٨ 018 ١١٠ آية" [ref=e139] [cursor=pointer]:
          - /url: /ar/pages/293
          - generic [ref=e140]: ١٨
          - generic [ref=e141]:
            - generic [ref=e142]: "018"
            - generic [ref=e143]: ١١٠ آية
          - img [ref=e144]
        - link "١٩ 019 ٩٨ آية" [ref=e146] [cursor=pointer]:
          - /url: /ar/pages/305
          - generic [ref=e147]: ١٩
          - generic [ref=e148]:
            - generic [ref=e149]: "019"
            - generic [ref=e150]: ٩٨ آية
          - img [ref=e151]
        - link "٢٠ 020 ١٣٥ آية" [ref=e153] [cursor=pointer]:
          - /url: /ar/pages/312
          - generic [ref=e154]: ٢٠
          - generic [ref=e155]:
            - generic [ref=e156]: "020"
            - generic [ref=e157]: ١٣٥ آية
          - img [ref=e158]
        - link "٢١ 021 ١١٢ آية" [ref=e160] [cursor=pointer]:
          - /url: /ar/pages/322
          - generic [ref=e161]: ٢١
          - generic [ref=e162]:
            - generic [ref=e163]: "021"
            - generic [ref=e164]: ١١٢ آية
          - img [ref=e165]
        - link "٢٢ 022 ٧٨ آية" [ref=e167] [cursor=pointer]:
          - /url: /ar/pages/332
          - generic [ref=e168]: ٢٢
          - generic [ref=e169]:
            - generic [ref=e170]: "022"
            - generic [ref=e171]: ٧٨ آية
          - img [ref=e172]
        - link "٢٣ 023 ١١٨ آية" [ref=e174] [cursor=pointer]:
          - /url: /ar/pages/342
          - generic [ref=e175]: ٢٣
          - generic [ref=e176]:
            - generic [ref=e177]: "023"
            - generic [ref=e178]: ١١٨ آية
          - img [ref=e179]
        - link "٢٤ 024 ٦٤ آية" [ref=e181] [cursor=pointer]:
          - /url: /ar/pages/350
          - generic [ref=e182]: ٢٤
          - generic [ref=e183]:
            - generic [ref=e184]: "024"
            - generic [ref=e185]: ٦٤ آية
          - img [ref=e186]
        - link "٢٥ 025 ٧٧ آية" [ref=e188] [cursor=pointer]:
          - /url: /ar/pages/359
          - generic [ref=e189]: ٢٥
          - generic [ref=e190]:
            - generic [ref=e191]: "025"
            - generic [ref=e192]: ٧٧ آية
          - img [ref=e193]
        - link "٢٦ 026 ٢٢٧ آية" [ref=e195] [cursor=pointer]:
          - /url: /ar/pages/367
          - generic [ref=e196]: ٢٦
          - generic [ref=e197]:
            - generic [ref=e198]: "026"
            - generic [ref=e199]: ٢٢٧ آية
          - img [ref=e200]
        - link "٢٧ 027 ٩٣ آية" [ref=e202] [cursor=pointer]:
          - /url: /ar/pages/377
          - generic [ref=e203]: ٢٧
          - generic [ref=e204]:
            - generic [ref=e205]: "027"
            - generic [ref=e206]: ٩٣ آية
          - img [ref=e207]
        - link "٢٨ 028 ٨٨ آية" [ref=e209] [cursor=pointer]:
          - /url: /ar/pages/385
          - generic [ref=e210]: ٢٨
          - generic [ref=e211]:
            - generic [ref=e212]: "028"
            - generic [ref=e213]: ٨٨ آية
          - img [ref=e214]
        - link "٢٩ 029 ٦٩ آية" [ref=e216] [cursor=pointer]:
          - /url: /ar/pages/396
          - generic [ref=e217]: ٢٩
          - generic [ref=e218]:
            - generic [ref=e219]: "029"
            - generic [ref=e220]: ٦٩ آية
          - img [ref=e221]
        - link "٣٠ 030 ٦٠ آية" [ref=e223] [cursor=pointer]:
          - /url: /ar/pages/404
          - generic [ref=e224]: ٣٠
          - generic [ref=e225]:
            - generic [ref=e226]: "030"
            - generic [ref=e227]: ٦٠ آية
          - img [ref=e228]
        - link "٣١ 031 ٣٤ آية" [ref=e230] [cursor=pointer]:
          - /url: /ar/pages/411
          - generic [ref=e231]: ٣١
          - generic [ref=e232]:
            - generic [ref=e233]: "031"
            - generic [ref=e234]: ٣٤ آية
          - img [ref=e235]
        - link "٣٢ 032 ٣٠ آية" [ref=e237] [cursor=pointer]:
          - /url: /ar/pages/415
          - generic [ref=e238]: ٣٢
          - generic [ref=e239]:
            - generic [ref=e240]: "032"
            - generic [ref=e241]: ٣٠ آية
          - img [ref=e242]
        - link "٣٣ 033 ٧٣ آية" [ref=e244] [cursor=pointer]:
          - /url: /ar/pages/418
          - generic [ref=e245]: ٣٣
          - generic [ref=e246]:
            - generic [ref=e247]: "033"
            - generic [ref=e248]: ٧٣ آية
          - img [ref=e249]
        - link "٣٤ 034 ٥٤ آية" [ref=e251] [cursor=pointer]:
          - /url: /ar/pages/428
          - generic [ref=e252]: ٣٤
          - generic [ref=e253]:
            - generic [ref=e254]: "034"
            - generic [ref=e255]: ٥٤ آية
          - img [ref=e256]
        - link "٣٥ 035 ٤٥ آية" [ref=e258] [cursor=pointer]:
          - /url: /ar/pages/434
          - generic [ref=e259]: ٣٥
          - generic [ref=e260]:
            - generic [ref=e261]: "035"
            - generic [ref=e262]: ٤٥ آية
          - img [ref=e263]
        - link "٣٦ 036 ٨٣ آية" [ref=e265] [cursor=pointer]:
          - /url: /ar/pages/440
          - generic [ref=e266]: ٣٦
          - generic [ref=e267]:
            - generic [ref=e268]: "036"
            - generic [ref=e269]: ٨٣ آية
          - img [ref=e270]
        - link "٣٧ 037 ١٨٢ آية" [ref=e272] [cursor=pointer]:
          - /url: /ar/pages/446
          - generic [ref=e273]: ٣٧
          - generic [ref=e274]:
            - generic [ref=e275]: "037"
            - generic [ref=e276]: ١٨٢ آية
          - img [ref=e277]
        - link "٣٨ 038 ٨٨ آية" [ref=e279] [cursor=pointer]:
          - /url: /ar/pages/453
          - generic [ref=e280]: ٣٨
          - generic [ref=e281]:
            - generic [ref=e282]: "038"
            - generic [ref=e283]: ٨٨ آية
          - img [ref=e284]
        - link "٣٩ 039 ٧٥ آية" [ref=e286] [cursor=pointer]:
          - /url: /ar/pages/458
          - generic [ref=e287]: ٣٩
          - generic [ref=e288]:
            - generic [ref=e289]: "039"
            - generic [ref=e290]: ٧٥ آية
          - img [ref=e291]
        - link "٤٠ 040 ٨٥ آية" [ref=e293] [cursor=pointer]:
          - /url: /ar/pages/467
          - generic [ref=e294]: ٤٠
          - generic [ref=e295]:
            - generic [ref=e296]: "040"
            - generic [ref=e297]: ٨٥ آية
          - img [ref=e298]
        - link "٤١ 041 ٥٤ آية" [ref=e300] [cursor=pointer]:
          - /url: /ar/pages/477
          - generic [ref=e301]: ٤١
          - generic [ref=e302]:
            - generic [ref=e303]: "041"
            - generic [ref=e304]: ٥٤ آية
          - img [ref=e305]
        - link "٤٢ 042 ٥٣ آية" [ref=e307] [cursor=pointer]:
          - /url: /ar/pages/483
          - generic [ref=e308]: ٤٢
          - generic [ref=e309]:
            - generic [ref=e310]: "042"
            - generic [ref=e311]: ٥٣ آية
          - img [ref=e312]
        - link "٤٣ 043 ٨٩ آية" [ref=e314] [cursor=pointer]:
          - /url: /ar/pages/489
          - generic [ref=e315]: ٤٣
          - generic [ref=e316]:
            - generic [ref=e317]: "043"
            - generic [ref=e318]: ٨٩ آية
          - img [ref=e319]
        - link "٤٤ 044 ٥٩ آية" [ref=e321] [cursor=pointer]:
          - /url: /ar/pages/496
          - generic [ref=e322]: ٤٤
          - generic [ref=e323]:
            - generic [ref=e324]: "044"
            - generic [ref=e325]: ٥٩ آية
          - img [ref=e326]
        - link "٤٥ 045 ٣٧ آية" [ref=e328] [cursor=pointer]:
          - /url: /ar/pages/499
          - generic [ref=e329]: ٤٥
          - generic [ref=e330]:
            - generic [ref=e331]: "045"
            - generic [ref=e332]: ٣٧ آية
          - img [ref=e333]
        - link "٤٦ 046 ٣٥ آية" [ref=e335] [cursor=pointer]:
          - /url: /ar/pages/502
          - generic [ref=e336]: ٤٦
          - generic [ref=e337]:
            - generic [ref=e338]: "046"
            - generic [ref=e339]: ٣٥ آية
          - img [ref=e340]
        - link "٤٧ 047 ٣٨ آية" [ref=e342] [cursor=pointer]:
          - /url: /ar/pages/507
          - generic [ref=e343]: ٤٧
          - generic [ref=e344]:
            - generic [ref=e345]: "047"
            - generic [ref=e346]: ٣٨ آية
          - img [ref=e347]
        - link "٤٨ 048 ٢٩ آية" [ref=e349] [cursor=pointer]:
          - /url: /ar/pages/511
          - generic [ref=e350]: ٤٨
          - generic [ref=e351]:
            - generic [ref=e352]: "048"
            - generic [ref=e353]: ٢٩ آية
          - img [ref=e354]
        - link "٤٩ 049 ١٨ آية" [ref=e356] [cursor=pointer]:
          - /url: /ar/pages/515
          - generic [ref=e357]: ٤٩
          - generic [ref=e358]:
            - generic [ref=e359]: "049"
            - generic [ref=e360]: ١٨ آية
          - img [ref=e361]
        - link "٥٠ 050 ٤٥ آية" [ref=e363] [cursor=pointer]:
          - /url: /ar/pages/518
          - generic [ref=e364]: ٥٠
          - generic [ref=e365]:
            - generic [ref=e366]: "050"
            - generic [ref=e367]: ٤٥ آية
          - img [ref=e368]
        - link "٥١ 051 ٦٠ آية" [ref=e370] [cursor=pointer]:
          - /url: /ar/pages/520
          - generic [ref=e371]: ٥١
          - generic [ref=e372]:
            - generic [ref=e373]: "051"
            - generic [ref=e374]: ٦٠ آية
          - img [ref=e375]
        - link "٥٢ 052 ٤٩ آية" [ref=e377] [cursor=pointer]:
          - /url: /ar/pages/523
          - generic [ref=e378]: ٥٢
          - generic [ref=e379]:
            - generic [ref=e380]: "052"
            - generic [ref=e381]: ٤٩ آية
          - img [ref=e382]
        - link "٥٣ 053 ٦٢ آية" [ref=e384] [cursor=pointer]:
          - /url: /ar/pages/526
          - generic [ref=e385]: ٥٣
          - generic [ref=e386]:
            - generic [ref=e387]: "053"
            - generic [ref=e388]: ٦٢ آية
          - img [ref=e389]
        - link "٥٤ 054 ٥٥ آية" [ref=e391] [cursor=pointer]:
          - /url: /ar/pages/528
          - generic [ref=e392]: ٥٤
          - generic [ref=e393]:
            - generic [ref=e394]: "054"
            - generic [ref=e395]: ٥٥ آية
          - img [ref=e396]
        - link "٥٥ 055 ٧٨ آية" [ref=e398] [cursor=pointer]:
          - /url: /ar/pages/531
          - generic [ref=e399]: ٥٥
          - generic [ref=e400]:
            - generic [ref=e401]: "055"
            - generic [ref=e402]: ٧٨ آية
          - img [ref=e403]
        - link "٥٦ 056 ٩٦ آية" [ref=e405] [cursor=pointer]:
          - /url: /ar/pages/534
          - generic [ref=e406]: ٥٦
          - generic [ref=e407]:
            - generic [ref=e408]: "056"
            - generic [ref=e409]: ٩٦ آية
          - img [ref=e410]
        - link "٥٧ 057 ٢٩ آية" [ref=e412] [cursor=pointer]:
          - /url: /ar/pages/537
          - generic [ref=e413]: ٥٧
          - generic [ref=e414]:
            - generic [ref=e415]: "057"
            - generic [ref=e416]: ٢٩ آية
          - img [ref=e417]
        - link "٥٨ 058 ٢٢ آية" [ref=e419] [cursor=pointer]:
          - /url: /ar/pages/542
          - generic [ref=e420]: ٥٨
          - generic [ref=e421]:
            - generic [ref=e422]: "058"
            - generic [ref=e423]: ٢٢ آية
          - img [ref=e424]
        - link "٥٩ 059 ٢٤ آية" [ref=e426] [cursor=pointer]:
          - /url: /ar/pages/545
          - generic [ref=e427]: ٥٩
          - generic [ref=e428]:
            - generic [ref=e429]: "059"
            - generic [ref=e430]: ٢٤ آية
          - img [ref=e431]
        - link "٦٠ 060 ١٣ آية" [ref=e433] [cursor=pointer]:
          - /url: /ar/pages/549
          - generic [ref=e434]: ٦٠
          - generic [ref=e435]:
            - generic [ref=e436]: "060"
            - generic [ref=e437]: ١٣ آية
          - img [ref=e438]
        - link "٦١ 061 ١٤ آية" [ref=e440] [cursor=pointer]:
          - /url: /ar/pages/551
          - generic [ref=e441]: ٦١
          - generic [ref=e442]:
            - generic [ref=e443]: "061"
            - generic [ref=e444]: ١٤ آية
          - img [ref=e445]
        - link "٦٢ 062 ١١ آية" [ref=e447] [cursor=pointer]:
          - /url: /ar/pages/553
          - generic [ref=e448]: ٦٢
          - generic [ref=e449]:
            - generic [ref=e450]: "062"
            - generic [ref=e451]: ١١ آية
          - img [ref=e452]
        - link "٦٣ 063 ١١ آية" [ref=e454] [cursor=pointer]:
          - /url: /ar/pages/554
          - generic [ref=e455]: ٦٣
          - generic [ref=e456]:
            - generic [ref=e457]: "063"
            - generic [ref=e458]: ١١ آية
          - img [ref=e459]
        - link "٦٤ 064 ١٨ آية" [ref=e461] [cursor=pointer]:
          - /url: /ar/pages/556
          - generic [ref=e462]: ٦٤
          - generic [ref=e463]:
            - generic [ref=e464]: "064"
            - generic [ref=e465]: ١٨ آية
          - img [ref=e466]
        - link "٦٥ 065 ١٢ آية" [ref=e468] [cursor=pointer]:
          - /url: /ar/pages/558
          - generic [ref=e469]: ٦٥
          - generic [ref=e470]:
            - generic [ref=e471]: "065"
            - generic [ref=e472]: ١٢ آية
          - img [ref=e473]
        - link "٦٦ 066 ١٢ آية" [ref=e475] [cursor=pointer]:
          - /url: /ar/pages/560
          - generic [ref=e476]: ٦٦
          - generic [ref=e477]:
            - generic [ref=e478]: "066"
            - generic [ref=e479]: ١٢ آية
          - img [ref=e480]
        - link "٦٧ 067 ٣٠ آية" [ref=e482] [cursor=pointer]:
          - /url: /ar/pages/562
          - generic [ref=e483]: ٦٧
          - generic [ref=e484]:
            - generic [ref=e485]: "067"
            - generic [ref=e486]: ٣٠ آية
          - img [ref=e487]
        - link "٦٨ 068 ٥٢ آية" [ref=e489] [cursor=pointer]:
          - /url: /ar/pages/564
          - generic [ref=e490]: ٦٨
          - generic [ref=e491]:
            - generic [ref=e492]: "068"
            - generic [ref=e493]: ٥٢ آية
          - img [ref=e494]
        - link "٦٩ 069 ٥٢ آية" [ref=e496] [cursor=pointer]:
          - /url: /ar/pages/566
          - generic [ref=e497]: ٦٩
          - generic [ref=e498]:
            - generic [ref=e499]: "069"
            - generic [ref=e500]: ٥٢ آية
          - img [ref=e501]
        - link "٧٠ 070 ٤٤ آية" [ref=e503] [cursor=pointer]:
          - /url: /ar/pages/568
          - generic [ref=e504]: ٧٠
          - generic [ref=e505]:
            - generic [ref=e506]: "070"
            - generic [ref=e507]: ٤٤ آية
          - img [ref=e508]
        - link "٧١ 071 ٢٨ آية" [ref=e510] [cursor=pointer]:
          - /url: /ar/pages/570
          - generic [ref=e511]: ٧١
          - generic [ref=e512]:
            - generic [ref=e513]: "071"
            - generic [ref=e514]: ٢٨ آية
          - img [ref=e515]
        - link "٧٢ 072 ٢٨ آية" [ref=e517] [cursor=pointer]:
          - /url: /ar/pages/572
          - generic [ref=e518]: ٧٢
          - generic [ref=e519]:
            - generic [ref=e520]: "072"
            - generic [ref=e521]: ٢٨ آية
          - img [ref=e522]
        - link "٧٣ 073 ٢٠ آية" [ref=e524] [cursor=pointer]:
          - /url: /ar/pages/574
          - generic [ref=e525]: ٧٣
          - generic [ref=e526]:
            - generic [ref=e527]: "073"
            - generic [ref=e528]: ٢٠ آية
          - img [ref=e529]
        - link "٧٤ 074 ٥٦ آية" [ref=e531] [cursor=pointer]:
          - /url: /ar/pages/575
          - generic [ref=e532]: ٧٤
          - generic [ref=e533]:
            - generic [ref=e534]: "074"
            - generic [ref=e535]: ٥٦ آية
          - img [ref=e536]
        - link "٧٥ 075 ٤٠ آية" [ref=e538] [cursor=pointer]:
          - /url: /ar/pages/577
          - generic [ref=e539]: ٧٥
          - generic [ref=e540]:
            - generic [ref=e541]: "075"
            - generic [ref=e542]: ٤٠ آية
          - img [ref=e543]
        - link "٧٦ 076 ٣١ آية" [ref=e545] [cursor=pointer]:
          - /url: /ar/pages/578
          - generic [ref=e546]: ٧٦
          - generic [ref=e547]:
            - generic [ref=e548]: "076"
            - generic [ref=e549]: ٣١ آية
          - img [ref=e550]
        - link "٧٧ 077 ٥٠ آية" [ref=e552] [cursor=pointer]:
          - /url: /ar/pages/580
          - generic [ref=e553]: ٧٧
          - generic [ref=e554]:
            - generic [ref=e555]: "077"
            - generic [ref=e556]: ٥٠ آية
          - img [ref=e557]
        - link "٧٨ 078 ٤٠ آية" [ref=e559] [cursor=pointer]:
          - /url: /ar/pages/582
          - generic [ref=e560]: ٧٨
          - generic [ref=e561]:
            - generic [ref=e562]: "078"
            - generic [ref=e563]: ٤٠ آية
          - img [ref=e564]
        - link "٧٩ 079 ٤٦ آية" [ref=e566] [cursor=pointer]:
          - /url: /ar/pages/583
          - generic [ref=e567]: ٧٩
          - generic [ref=e568]:
            - generic [ref=e569]: "079"
            - generic [ref=e570]: ٤٦ آية
          - img [ref=e571]
        - link "٨٠ 080 ٤٢ آية" [ref=e573] [cursor=pointer]:
          - /url: /ar/pages/585
          - generic [ref=e574]: ٨٠
          - generic [ref=e575]:
            - generic [ref=e576]: "080"
            - generic [ref=e577]: ٤٢ آية
          - img [ref=e578]
        - link "٨١ 081 ٢٩ آية" [ref=e580] [cursor=pointer]:
          - /url: /ar/pages/586
          - generic [ref=e581]: ٨١
          - generic [ref=e582]:
            - generic [ref=e583]: "081"
            - generic [ref=e584]: ٢٩ آية
          - img [ref=e585]
        - link "٨٢ 082 ١٩ آية" [ref=e587] [cursor=pointer]:
          - /url: /ar/pages/587
          - generic [ref=e588]: ٨٢
          - generic [ref=e589]:
            - generic [ref=e590]: "082"
            - generic [ref=e591]: ١٩ آية
          - img [ref=e592]
        - link "٨٣ 083 ٣٦ آية" [ref=e594] [cursor=pointer]:
          - /url: /ar/pages/587
          - generic [ref=e595]: ٨٣
          - generic [ref=e596]:
            - generic [ref=e597]: "083"
            - generic [ref=e598]: ٣٦ آية
          - img [ref=e599]
        - link "٨٤ 084 ٢٥ آية" [ref=e601] [cursor=pointer]:
          - /url: /ar/pages/589
          - generic [ref=e602]: ٨٤
          - generic [ref=e603]:
            - generic [ref=e604]: "084"
            - generic [ref=e605]: ٢٥ آية
          - img [ref=e606]
        - link "٨٥ 085 ٢٢ آية" [ref=e608] [cursor=pointer]:
          - /url: /ar/pages/590
          - generic [ref=e609]: ٨٥
          - generic [ref=e610]:
            - generic [ref=e611]: "085"
            - generic [ref=e612]: ٢٢ آية
          - img [ref=e613]
        - link "٨٦ 086 ١٧ آية" [ref=e615] [cursor=pointer]:
          - /url: /ar/pages/591
          - generic [ref=e616]: ٨٦
          - generic [ref=e617]:
            - generic [ref=e618]: "086"
            - generic [ref=e619]: ١٧ آية
          - img [ref=e620]
        - link "٨٧ 087 ١٩ آية" [ref=e622] [cursor=pointer]:
          - /url: /ar/pages/591
          - generic [ref=e623]: ٨٧
          - generic [ref=e624]:
            - generic [ref=e625]: "087"
            - generic [ref=e626]: ١٩ آية
          - img [ref=e627]
        - link "٨٨ 088 ٢٦ آية" [ref=e629] [cursor=pointer]:
          - /url: /ar/pages/592
          - generic [ref=e630]: ٨٨
          - generic [ref=e631]:
            - generic [ref=e632]: "088"
            - generic [ref=e633]: ٢٦ آية
          - img [ref=e634]
        - link "٨٩ 089 ٣٠ آية" [ref=e636] [cursor=pointer]:
          - /url: /ar/pages/593
          - generic [ref=e637]: ٨٩
          - generic [ref=e638]:
            - generic [ref=e639]: "089"
            - generic [ref=e640]: ٣٠ آية
          - img [ref=e641]
        - link "٩٠ 090 ٢٠ آية" [ref=e643] [cursor=pointer]:
          - /url: /ar/pages/594
          - generic [ref=e644]: ٩٠
          - generic [ref=e645]:
            - generic [ref=e646]: "090"
            - generic [ref=e647]: ٢٠ آية
          - img [ref=e648]
        - link "٩١ 091 ١٥ آية" [ref=e650] [cursor=pointer]:
          - /url: /ar/pages/595
          - generic [ref=e651]: ٩١
          - generic [ref=e652]:
            - generic [ref=e653]: "091"
            - generic [ref=e654]: ١٥ آية
          - img [ref=e655]
        - link "٩٢ 092 ٢١ آية" [ref=e657] [cursor=pointer]:
          - /url: /ar/pages/595
          - generic [ref=e658]: ٩٢
          - generic [ref=e659]:
            - generic [ref=e660]: "092"
            - generic [ref=e661]: ٢١ آية
          - img [ref=e662]
        - link "٩٣ 093 ١١ آية" [ref=e664] [cursor=pointer]:
          - /url: /ar/pages/596
          - generic [ref=e665]: ٩٣
          - generic [ref=e666]:
            - generic [ref=e667]: "093"
            - generic [ref=e668]: ١١ آية
          - img [ref=e669]
        - link "٩٤ 094 ٨ آيات" [ref=e671] [cursor=pointer]:
          - /url: /ar/pages/596
          - generic [ref=e672]: ٩٤
          - generic [ref=e673]:
            - generic [ref=e674]: "094"
            - generic [ref=e675]: ٨ آيات
          - img [ref=e676]
        - link "٩٥ 095 ٨ آيات" [ref=e678] [cursor=pointer]:
          - /url: /ar/pages/597
          - generic [ref=e679]: ٩٥
          - generic [ref=e680]:
            - generic [ref=e681]: "095"
            - generic [ref=e682]: ٨ آيات
          - img [ref=e683]
        - link "٩٦ 096 ١٩ آية" [ref=e685] [cursor=pointer]:
          - /url: /ar/pages/597
          - generic [ref=e686]: ٩٦
          - generic [ref=e687]:
            - generic [ref=e688]: "096"
            - generic [ref=e689]: ١٩ آية
          - img [ref=e690]
        - link "٩٧ 097 ٥ آيات" [ref=e692] [cursor=pointer]:
          - /url: /ar/pages/598
          - generic [ref=e693]: ٩٧
          - generic [ref=e694]:
            - generic [ref=e695]: "097"
            - generic [ref=e696]: ٥ آيات
          - img [ref=e697]
        - link "٩٨ 098 ٨ آيات" [ref=e699] [cursor=pointer]:
          - /url: /ar/pages/598
          - generic [ref=e700]: ٩٨
          - generic [ref=e701]:
            - generic [ref=e702]: "098"
            - generic [ref=e703]: ٨ آيات
          - img [ref=e704]
        - link "٩٩ 099 ٨ آيات" [ref=e706] [cursor=pointer]:
          - /url: /ar/pages/599
          - generic [ref=e707]: ٩٩
          - generic [ref=e708]:
            - generic [ref=e709]: "099"
            - generic [ref=e710]: ٨ آيات
          - img [ref=e711]
        - link "١٠٠ 100 ١١ آية" [ref=e713] [cursor=pointer]:
          - /url: /ar/pages/599
          - generic [ref=e714]: ١٠٠
          - generic [ref=e715]:
            - generic [ref=e716]: "100"
            - generic [ref=e717]: ١١ آية
          - img [ref=e718]
        - link "١٠١ 101 ١١ آية" [ref=e720] [cursor=pointer]:
          - /url: /ar/pages/600
          - generic [ref=e721]: ١٠١
          - generic [ref=e722]:
            - generic [ref=e723]: "101"
            - generic [ref=e724]: ١١ آية
          - img [ref=e725]
        - link "١٠٢ 102 ٨ آيات" [ref=e727] [cursor=pointer]:
          - /url: /ar/pages/600
          - generic [ref=e728]: ١٠٢
          - generic [ref=e729]:
            - generic [ref=e730]: "102"
            - generic [ref=e731]: ٨ آيات
          - img [ref=e732]
        - link "١٠٣ 103 ٣ آيات" [ref=e734] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e735]: ١٠٣
          - generic [ref=e736]:
            - generic [ref=e737]: "103"
            - generic [ref=e738]: ٣ آيات
          - img [ref=e739]
        - link "١٠٤ 104 ٩ آيات" [ref=e741] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e742]: ١٠٤
          - generic [ref=e743]:
            - generic [ref=e744]: "104"
            - generic [ref=e745]: ٩ آيات
          - img [ref=e746]
        - link "١٠٥ 105 ٥ آيات" [ref=e748] [cursor=pointer]:
          - /url: /ar/pages/601
          - generic [ref=e749]: ١٠٥
          - generic [ref=e750]:
            - generic [ref=e751]: "105"
            - generic [ref=e752]: ٥ آيات
          - img [ref=e753]
        - link "١٠٦ 106 ٤ آيات" [ref=e755] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e756]: ١٠٦
          - generic [ref=e757]:
            - generic [ref=e758]: "106"
            - generic [ref=e759]: ٤ آيات
          - img [ref=e760]
        - link "١٠٧ 107 ٧ آيات" [ref=e762] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e763]: ١٠٧
          - generic [ref=e764]:
            - generic [ref=e765]: "107"
            - generic [ref=e766]: ٧ آيات
          - img [ref=e767]
        - link "١٠٨ 108 ٣ آيات" [ref=e769] [cursor=pointer]:
          - /url: /ar/pages/602
          - generic [ref=e770]: ١٠٨
          - generic [ref=e771]:
            - generic [ref=e772]: "108"
            - generic [ref=e773]: ٣ آيات
          - img [ref=e774]
        - link "١٠٩ 109 ٦ آيات" [ref=e776] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e777]: ١٠٩
          - generic [ref=e778]:
            - generic [ref=e779]: "109"
            - generic [ref=e780]: ٦ آيات
          - img [ref=e781]
        - link "١١٠ 110 ٣ آيات" [ref=e783] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e784]: ١١٠
          - generic [ref=e785]:
            - generic [ref=e786]: "110"
            - generic [ref=e787]: ٣ آيات
          - img [ref=e788]
        - link "١١١ 111 ٥ آيات" [ref=e790] [cursor=pointer]:
          - /url: /ar/pages/603
          - generic [ref=e791]: ١١١
          - generic [ref=e792]:
            - generic [ref=e793]: "111"
            - generic [ref=e794]: ٥ آيات
          - img [ref=e795]
        - link "١١٢ 112 ٤ آيات" [ref=e797] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e798]: ١١٢
          - generic [ref=e799]:
            - generic [ref=e800]: "112"
            - generic [ref=e801]: ٤ آيات
          - img [ref=e802]
        - link "١١٣ 113 ٥ آيات" [ref=e804] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e805]: ١١٣
          - generic [ref=e806]:
            - generic [ref=e807]: "113"
            - generic [ref=e808]: ٥ آيات
          - img [ref=e809]
        - link "١١٤ 114 ٦ آيات" [ref=e811] [cursor=pointer]:
          - /url: /ar/pages/604
          - generic [ref=e812]: ١١٤
          - generic [ref=e813]:
            - generic [ref=e814]: "114"
            - generic [ref=e815]: ٦ آيات
          - img [ref=e816]
  - alert [ref=e818]
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
  26  | // NavOverflowMenu's hamburger trigger — below md, Settings/SharedMushafLink/
  27  | // NotificationBell/UserMenu all collapse behind this instead of rendering
  28  | // directly in the nav row (docs/plans/home-page-design-fixes.md).
  29  | const MORE_LABEL: Record<Locale, string> = {
  30  |   ar: "المزيد",
  31  |   en: "More",
  32  | };
  33  | // The results dropdown's surah heading, which SearchQueryResults renders only
  34  | // once `chapters.length > 0` — so it cannot match before results exist. Matched
  35  | // by prefix because the count is rendered inside it as a localized numeral.
  36  | // Deliberately not a locator for the result row itself: the home page's own
  37  | // surah list renders each surah as a link with the same accessible name, so
  38  | // `getByRole("link", { name: "Al-Fatihah" })` would resolve against the list
  39  | // underneath the dropdown and pass before the search had rendered anything.
  40  | const SEARCH_RESULTS_HEADING: Record<Locale, RegExp> = {
  41  |   ar: /^السور \(/,
  42  |   en: /^Surahs \(/,
  43  | };
  44  | 
  45  | /** Sets the theme in localStorage before first paint, mirroring app/utils/storage.ts's JSON.stringify shape. */
  46  | async function withTheme(page: Page, theme: Theme) {
  47  |   await page.addInitScript((t) => {
  48  |     window.localStorage.setItem("theme", JSON.stringify(t));
  49  |   }, theme);
  50  | }
  51  | 
  52  | // Blocks until every mounted safha has painted its word rows.
  53  | //
  54  | // `toHaveScreenshot` decides a page has settled by comparing two screenshots
  55  | // 100ms apart — but it disables CSS animations first, which freezes the loading
  56  | // skeleton's `animate-pulse` and makes a half-loaded reader look like a settled
  57  | // one. Its only built-in readiness signal, `document.fonts.ready`, resolves long
  58  | // before the line content arrives (ADR 0034), so without this the captured frame
  59  | // is whichever of {skeleton, text} the runner happened to reach — measured at
  60  | // 4-in-8 runs, and the difference between the two lands right on the diff gate.
  61  | //
  62  | // This asserts content is PRESENT rather than that the skeleton is absent. A
  63  | // `no .animate-pulse` check returns an empty list — and so passes instantly —
  64  | // the moment that class is renamed, silently restoring the flake with no failing
  65  | // test to reveal it. The length guard is the same hazard one level up: `every()`
  66  | // on an empty list is vacuously true. See docs/plans/visual-e2e-testing.md
  67  | // Addendum (2026-08-02).
  68  | async function waitForReaderContent(page: Page) {
  69  |   await page.waitForFunction(() => {
  70  |     const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
  71  |     return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  72  |   });
  73  | }
  74  | 
  75  | for (const locale of LOCALES) {
  76  |   for (const theme of THEMES) {
  77  |     const suffix = `${locale}-${theme}`;
  78  | 
  79  |     test.describe(`home (${suffix})`, () => {
  80  |       test("surah list", async ({ page }) => {
  81  |         await withTheme(page, theme);
  82  |         await page.goto(`/${locale}`);
> 83  |         await expect(page).toHaveScreenshot(`home-${suffix}.png`);
      |                            ^ Error: expect(page).toHaveScreenshot(expected) failed
  84  |       });
  85  |     });
  86  | 
  87  |     test.describe(`quran page 1 (${suffix})`, () => {
  88  |       test("single page, short opening page", async ({ page }) => {
  89  |         await withTheme(page, theme);
  90  |         await page.goto(`/${locale}/pages/1`);
  91  |         await waitForReaderContent(page);
  92  |         await expect(page).toHaveScreenshot(`page-1-${suffix}.png`);
  93  |       });
  94  |     });
  95  | 
  96  |     test.describe(`quran pages 2-3 double-spread (${suffix})`, () => {
  97  |       test("double-page spread", async ({ page }, testInfo) => {
  98  |         test.skip(
  99  |           testInfo.project.name === "mobile",
  100 |           "double-page spread only renders at lg+ (ADR 0013) — nothing distinct to capture on mobile"
  101 |         );
  102 |         await withTheme(page, theme);
  103 |         await page.goto(`/${locale}/pages/2`);
  104 |         await waitForReaderContent(page);
  105 |         await expect(page).toHaveScreenshot(`spread-2-3-${suffix}.png`);
  106 |       });
  107 |     });
  108 | 
  109 |     test.describe(`search results (${suffix})`, () => {
  110 |       test("search for a chapter", async ({ page }, testInfo) => {
  111 |         await withTheme(page, theme);
  112 |         await page.goto(`/${locale}`);
  113 | 
  114 |         // Mobile opens search in a dialog while the nav's own search bar stays
  115 |         // mounted, so both render a results dropdown — every locator below has to
  116 |         // be scoped to the one under test or it hits a strict-mode violation.
  117 |         let scope: Page | Locator = page;
  118 |         if (testInfo.project.name === "mobile") {
  119 |           await page.getByRole("button", { name: SEARCH_PLACEHOLDER[locale] }).click();
  120 |           scope = page.getByRole("dialog");
  121 |         }
  122 |         await scope.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);
  123 | 
  124 |         // Positive wait on the rendered results rather than a fixed sleep: the
  125 |         // old `waitForTimeout(800)` left only ~300ms after the 500ms debounce for
  126 |         // the request and render, so the screenshot caught either the spinner or
  127 |         // the dropdown depending on timing — 2 of the 4 search snapshots differed
  128 |         // run-to-run at a ratio of ~0.05, well past the diff gate.
  129 |         await expect(scope.getByText(SEARCH_RESULTS_HEADING[locale])).toBeVisible();
  130 |         await expect(page).toHaveScreenshot(`search-${suffix}.png`);
  131 |       });
  132 |     });
  133 | 
  134 |     test.describe(`settings sheet (${suffix})`, () => {
  135 |       test("open settings sheet", async ({ page }, testInfo) => {
  136 |         await withTheme(page, theme);
  137 |         await page.goto(`/${locale}`);
  138 |         // Below md, Settings is behind NavOverflowMenu's hamburger trigger,
  139 |         // not a direct nav-row button (docs/plans/home-page-design-fixes.md)
  140 |         // — open that first, then click Settings inside the revealed sheet.
  141 |         if (testInfo.project.name === "mobile") {
  142 |           await page.getByRole("button", { name: MORE_LABEL[locale] }).click();
  143 |         }
  144 |         await page.getByRole("button", { name: SETTINGS_LABEL[locale] }).click();
  145 |         // Sheet slide-in animation (and, on mobile, the overflow sheet's
  146 |         // slide-out happening at the same time).
  147 |         await page.waitForTimeout(600);
  148 |         await expect(page).toHaveScreenshot(`settings-${suffix}.png`);
  149 |       });
  150 |     });
  151 |   }
  152 | }
  153 | 
```