# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> home (en-dark) >> surah list
- Location: e2e/tests/visual.spec.ts:78:11

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  40044 pixels (ratio 0.04 of all image pixels) are different.

  Snapshot: home-en-dark.png

Call log:
  - Expect "toHaveScreenshot(home-en-dark.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 40044 pixels (ratio 0.04 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 40044 pixels (ratio 0.04 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Home" [ref=e5] [cursor=pointer]:
          - /url: /
        - link "Continue Reading" [ref=e8] [cursor=pointer]:
          - /url: /en/pages/1
          - img [ref=e9]
          - generic [ref=e11]: Continue Reading
        - generic [ref=e12]:
          - button "Search surah by name or number" [ref=e13] [cursor=pointer]:
            - img [ref=e14]
          - button "Notifications" [ref=e17] [cursor=pointer]:
            - img [ref=e18]
        - button "Settings" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
        - button "Account" [ref=e28] [cursor=pointer]:
          - img [ref=e29]
    - main [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e35]: THE NOBLE QURAN
        - heading "Furqan" [level=1] [ref=e38]
        - paragraph [ref=e40]: Every word is a trust, every verse a journey — annotate, reflect, and perfect your memorization of the Noble Quran, guided step by step alongside your teacher.
      - generic [ref=e41]:
        - generic [ref=e42]:
          - img [ref=e44]
          - generic [ref=e46]:
            - generic [ref=e47]: Continue Reading
            - generic [ref=e48]:
              - generic [ref=e49]: Al-Fatihah
              - generic [ref=e50]: • Page 1
        - link "Resume Reading" [ref=e51] [cursor=pointer]:
          - /url: /en/pages/1
          - generic [ref=e52]: Resume Reading
          - img [ref=e53]
      - region "Recommended Surahs" [ref=e55]:
        - generic [ref=e58]: Recommended Surahs
        - generic [ref=e60]:
          - link "Al-Fatihah" [ref=e61] [cursor=pointer]:
            - /url: /en/pages/1
            - generic [ref=e62]: Al-Fatihah
          - link "Al-Kahf" [ref=e63] [cursor=pointer]:
            - /url: /en/pages/293
            - generic [ref=e64]: Al-Kahf
          - link "Ya-Sin" [ref=e65] [cursor=pointer]:
            - /url: /en/pages/440
            - generic [ref=e66]: Ya-Sin
          - link "Ar-Rahman" [ref=e67] [cursor=pointer]:
            - /url: /en/pages/531
            - generic [ref=e68]: Ar-Rahman
          - link "Al-Waqi'ah" [ref=e69] [cursor=pointer]:
            - /url: /en/pages/534
            - generic [ref=e70]: Al-Waqi'ah
          - link "Al-Mulk" [ref=e71] [cursor=pointer]:
            - /url: /en/pages/562
            - generic [ref=e72]: Al-Mulk
      - generic [ref=e73]:
        - link "1 Al-Fatihah Meccan 7 Verses Page 1" [ref=e74] [cursor=pointer]:
          - /url: /en/pages/1
          - generic [ref=e75]:
            - generic [ref=e76]:
              - img [ref=e77]
              - generic [ref=e80]: "1"
            - generic [ref=e82]: Al-Fatihah
            - generic [ref=e83]: Meccan
          - generic [ref=e84]:
            - generic [ref=e85]: 7 Verses
            - generic [ref=e86]: Page 1
        - link "2 Al-Baqarah Medinan 286 Verses Page 2" [ref=e87] [cursor=pointer]:
          - /url: /en/pages/2
          - generic [ref=e88]:
            - generic [ref=e89]:
              - img [ref=e90]
              - generic [ref=e93]: "2"
            - generic [ref=e95]: Al-Baqarah
            - generic [ref=e96]: Medinan
          - generic [ref=e97]:
            - generic [ref=e98]: 286 Verses
            - generic [ref=e99]: Page 2
        - link "3 Ali 'Imran Medinan 200 Verses Page 50" [ref=e100] [cursor=pointer]:
          - /url: /en/pages/50
          - generic [ref=e101]:
            - generic [ref=e102]:
              - img [ref=e103]
              - generic [ref=e106]: "3"
            - generic [ref=e108]: Ali 'Imran
            - generic [ref=e109]: Medinan
          - generic [ref=e110]:
            - generic [ref=e111]: 200 Verses
            - generic [ref=e112]: Page 50
        - link "4 An-Nisa Medinan 176 Verses Page 77" [ref=e113] [cursor=pointer]:
          - /url: /en/pages/77
          - generic [ref=e114]:
            - generic [ref=e115]:
              - img [ref=e116]
              - generic [ref=e119]: "4"
            - generic [ref=e121]: An-Nisa
            - generic [ref=e122]: Medinan
          - generic [ref=e123]:
            - generic [ref=e124]: 176 Verses
            - generic [ref=e125]: Page 77
        - link "5 Al-Ma'idah Medinan 120 Verses Page 106" [ref=e126] [cursor=pointer]:
          - /url: /en/pages/106
          - generic [ref=e127]:
            - generic [ref=e128]:
              - img [ref=e129]
              - generic [ref=e132]: "5"
            - generic [ref=e134]: Al-Ma'idah
            - generic [ref=e135]: Medinan
          - generic [ref=e136]:
            - generic [ref=e137]: 120 Verses
            - generic [ref=e138]: Page 106
        - link "6 Al-An'am Meccan 165 Verses Page 128" [ref=e139] [cursor=pointer]:
          - /url: /en/pages/128
          - generic [ref=e140]:
            - generic [ref=e141]:
              - img [ref=e142]
              - generic [ref=e145]: "6"
            - generic [ref=e147]: Al-An'am
            - generic [ref=e148]: Meccan
          - generic [ref=e149]:
            - generic [ref=e150]: 165 Verses
            - generic [ref=e151]: Page 128
        - link "7 Al-A'raf Meccan 206 Verses Page 151" [ref=e152] [cursor=pointer]:
          - /url: /en/pages/151
          - generic [ref=e153]:
            - generic [ref=e154]:
              - img [ref=e155]
              - generic [ref=e158]: "7"
            - generic [ref=e160]: Al-A'raf
            - generic [ref=e161]: Meccan
          - generic [ref=e162]:
            - generic [ref=e163]: 206 Verses
            - generic [ref=e164]: Page 151
        - link "8 Al-Anfal Medinan 75 Verses Page 177" [ref=e165] [cursor=pointer]:
          - /url: /en/pages/177
          - generic [ref=e166]:
            - generic [ref=e167]:
              - img [ref=e168]
              - generic [ref=e171]: "8"
            - generic [ref=e173]: Al-Anfal
            - generic [ref=e174]: Medinan
          - generic [ref=e175]:
            - generic [ref=e176]: 75 Verses
            - generic [ref=e177]: Page 177
        - link "9 At-Tawbah Medinan 129 Verses Page 187" [ref=e178] [cursor=pointer]:
          - /url: /en/pages/187
          - generic [ref=e179]:
            - generic [ref=e180]:
              - img [ref=e181]
              - generic [ref=e184]: "9"
            - generic [ref=e186]: At-Tawbah
            - generic [ref=e187]: Medinan
          - generic [ref=e188]:
            - generic [ref=e189]: 129 Verses
            - generic [ref=e190]: Page 187
        - link "10 Yunus Meccan 109 Verses Page 208" [ref=e191] [cursor=pointer]:
          - /url: /en/pages/208
          - generic [ref=e192]:
            - generic [ref=e193]:
              - img [ref=e194]
              - generic [ref=e197]: "10"
            - generic [ref=e199]: Yunus
            - generic [ref=e200]: Meccan
          - generic [ref=e201]:
            - generic [ref=e202]: 109 Verses
            - generic [ref=e203]: Page 208
        - link "11 Hud Meccan 123 Verses Page 221" [ref=e204] [cursor=pointer]:
          - /url: /en/pages/221
          - generic [ref=e205]:
            - generic [ref=e206]:
              - img [ref=e207]
              - generic [ref=e210]: "11"
            - generic [ref=e212]: Hud
            - generic [ref=e213]: Meccan
          - generic [ref=e214]:
            - generic [ref=e215]: 123 Verses
            - generic [ref=e216]: Page 221
        - link "12 Yusuf Meccan 111 Verses Page 235" [ref=e217] [cursor=pointer]:
          - /url: /en/pages/235
          - generic [ref=e218]:
            - generic [ref=e219]:
              - img [ref=e220]
              - generic [ref=e223]: "12"
            - generic [ref=e225]: Yusuf
            - generic [ref=e226]: Meccan
          - generic [ref=e227]:
            - generic [ref=e228]: 111 Verses
            - generic [ref=e229]: Page 235
        - link "13 Ar-Ra'd Medinan 43 Verses Page 249" [ref=e230] [cursor=pointer]:
          - /url: /en/pages/249
          - generic [ref=e231]:
            - generic [ref=e232]:
              - img [ref=e233]
              - generic [ref=e236]: "13"
            - generic [ref=e238]: Ar-Ra'd
            - generic [ref=e239]: Medinan
          - generic [ref=e240]:
            - generic [ref=e241]: 43 Verses
            - generic [ref=e242]: Page 249
        - link "14 Ibrahim Meccan 52 Verses Page 255" [ref=e243] [cursor=pointer]:
          - /url: /en/pages/255
          - generic [ref=e244]:
            - generic [ref=e245]:
              - img [ref=e246]
              - generic [ref=e249]: "14"
            - generic [ref=e251]: Ibrahim
            - generic [ref=e252]: Meccan
          - generic [ref=e253]:
            - generic [ref=e254]: 52 Verses
            - generic [ref=e255]: Page 255
        - link "15 Al-Hijr Meccan 99 Verses Page 262" [ref=e256] [cursor=pointer]:
          - /url: /en/pages/262
          - generic [ref=e257]:
            - generic [ref=e258]:
              - img [ref=e259]
              - generic [ref=e262]: "15"
            - generic [ref=e264]: Al-Hijr
            - generic [ref=e265]: Meccan
          - generic [ref=e266]:
            - generic [ref=e267]: 99 Verses
            - generic [ref=e268]: Page 262
        - link "16 An-Nahl Meccan 128 Verses Page 267" [ref=e269] [cursor=pointer]:
          - /url: /en/pages/267
          - generic [ref=e270]:
            - generic [ref=e271]:
              - img [ref=e272]
              - generic [ref=e275]: "16"
            - generic [ref=e277]: An-Nahl
            - generic [ref=e278]: Meccan
          - generic [ref=e279]:
            - generic [ref=e280]: 128 Verses
            - generic [ref=e281]: Page 267
        - link "17 Al-Isra Meccan 111 Verses Page 282" [ref=e282] [cursor=pointer]:
          - /url: /en/pages/282
          - generic [ref=e283]:
            - generic [ref=e284]:
              - img [ref=e285]
              - generic [ref=e288]: "17"
            - generic [ref=e290]: Al-Isra
            - generic [ref=e291]: Meccan
          - generic [ref=e292]:
            - generic [ref=e293]: 111 Verses
            - generic [ref=e294]: Page 282
        - link "18 Al-Kahf Meccan 110 Verses Page 293" [ref=e295] [cursor=pointer]:
          - /url: /en/pages/293
          - generic [ref=e296]:
            - generic [ref=e297]:
              - img [ref=e298]
              - generic [ref=e301]: "18"
            - generic [ref=e303]: Al-Kahf
            - generic [ref=e304]: Meccan
          - generic [ref=e305]:
            - generic [ref=e306]: 110 Verses
            - generic [ref=e307]: Page 293
        - link "19 Maryam Meccan 98 Verses Page 305" [ref=e308] [cursor=pointer]:
          - /url: /en/pages/305
          - generic [ref=e309]:
            - generic [ref=e310]:
              - img [ref=e311]
              - generic [ref=e314]: "19"
            - generic [ref=e316]: Maryam
            - generic [ref=e317]: Meccan
          - generic [ref=e318]:
            - generic [ref=e319]: 98 Verses
            - generic [ref=e320]: Page 305
        - link "20 Taha Meccan 135 Verses Page 312" [ref=e321] [cursor=pointer]:
          - /url: /en/pages/312
          - generic [ref=e322]:
            - generic [ref=e323]:
              - img [ref=e324]
              - generic [ref=e327]: "20"
            - generic [ref=e329]: Taha
            - generic [ref=e330]: Meccan
          - generic [ref=e331]:
            - generic [ref=e332]: 135 Verses
            - generic [ref=e333]: Page 312
        - link "21 Al-Anbya Meccan 112 Verses Page 322" [ref=e334] [cursor=pointer]:
          - /url: /en/pages/322
          - generic [ref=e335]:
            - generic [ref=e336]:
              - img [ref=e337]
              - generic [ref=e340]: "21"
            - generic [ref=e342]: Al-Anbya
            - generic [ref=e343]: Meccan
          - generic [ref=e344]:
            - generic [ref=e345]: 112 Verses
            - generic [ref=e346]: Page 322
        - link "22 Al-Hajj Medinan 78 Verses Page 332" [ref=e347] [cursor=pointer]:
          - /url: /en/pages/332
          - generic [ref=e348]:
            - generic [ref=e349]:
              - img [ref=e350]
              - generic [ref=e353]: "22"
            - generic [ref=e355]: Al-Hajj
            - generic [ref=e356]: Medinan
          - generic [ref=e357]:
            - generic [ref=e358]: 78 Verses
            - generic [ref=e359]: Page 332
        - link "23 Al-Mu'minun Meccan 118 Verses Page 342" [ref=e360] [cursor=pointer]:
          - /url: /en/pages/342
          - generic [ref=e361]:
            - generic [ref=e362]:
              - img [ref=e363]
              - generic [ref=e366]: "23"
            - generic [ref=e368]: Al-Mu'minun
            - generic [ref=e369]: Meccan
          - generic [ref=e370]:
            - generic [ref=e371]: 118 Verses
            - generic [ref=e372]: Page 342
        - link "24 An-Nur Medinan 64 Verses Page 350" [ref=e373] [cursor=pointer]:
          - /url: /en/pages/350
          - generic [ref=e374]:
            - generic [ref=e375]:
              - img [ref=e376]
              - generic [ref=e379]: "24"
            - generic [ref=e381]: An-Nur
            - generic [ref=e382]: Medinan
          - generic [ref=e383]:
            - generic [ref=e384]: 64 Verses
            - generic [ref=e385]: Page 350
        - link "25 Al-Furqan Meccan 77 Verses Page 359" [ref=e386] [cursor=pointer]:
          - /url: /en/pages/359
          - generic [ref=e387]:
            - generic [ref=e388]:
              - img [ref=e389]
              - generic [ref=e392]: "25"
            - generic [ref=e394]: Al-Furqan
            - generic [ref=e395]: Meccan
          - generic [ref=e396]:
            - generic [ref=e397]: 77 Verses
            - generic [ref=e398]: Page 359
        - link "26 Ash-Shu'ara Meccan 227 Verses Page 367" [ref=e399] [cursor=pointer]:
          - /url: /en/pages/367
          - generic [ref=e400]:
            - generic [ref=e401]:
              - img [ref=e402]
              - generic [ref=e405]: "26"
            - generic [ref=e407]: Ash-Shu'ara
            - generic [ref=e408]: Meccan
          - generic [ref=e409]:
            - generic [ref=e410]: 227 Verses
            - generic [ref=e411]: Page 367
        - link "27 An-Naml Meccan 93 Verses Page 377" [ref=e412] [cursor=pointer]:
          - /url: /en/pages/377
          - generic [ref=e413]:
            - generic [ref=e414]:
              - img [ref=e415]
              - generic [ref=e418]: "27"
            - generic [ref=e420]: An-Naml
            - generic [ref=e421]: Meccan
          - generic [ref=e422]:
            - generic [ref=e423]: 93 Verses
            - generic [ref=e424]: Page 377
        - link "28 Al-Qasas Meccan 88 Verses Page 385" [ref=e425] [cursor=pointer]:
          - /url: /en/pages/385
          - generic [ref=e426]:
            - generic [ref=e427]:
              - img [ref=e428]
              - generic [ref=e431]: "28"
            - generic [ref=e433]: Al-Qasas
            - generic [ref=e434]: Meccan
          - generic [ref=e435]:
            - generic [ref=e436]: 88 Verses
            - generic [ref=e437]: Page 385
        - link "29 Al-'Ankabut Meccan 69 Verses Page 396" [ref=e438] [cursor=pointer]:
          - /url: /en/pages/396
          - generic [ref=e439]:
            - generic [ref=e440]:
              - img [ref=e441]
              - generic [ref=e444]: "29"
            - generic [ref=e446]: Al-'Ankabut
            - generic [ref=e447]: Meccan
          - generic [ref=e448]:
            - generic [ref=e449]: 69 Verses
            - generic [ref=e450]: Page 396
        - link "30 Ar-Rum Meccan 60 Verses Page 404" [ref=e451] [cursor=pointer]:
          - /url: /en/pages/404
          - generic [ref=e452]:
            - generic [ref=e453]:
              - img [ref=e454]
              - generic [ref=e457]: "30"
            - generic [ref=e459]: Ar-Rum
            - generic [ref=e460]: Meccan
          - generic [ref=e461]:
            - generic [ref=e462]: 60 Verses
            - generic [ref=e463]: Page 404
        - link "31 Luqman Meccan 34 Verses Page 411" [ref=e464] [cursor=pointer]:
          - /url: /en/pages/411
          - generic [ref=e465]:
            - generic [ref=e466]:
              - img [ref=e467]
              - generic [ref=e470]: "31"
            - generic [ref=e472]: Luqman
            - generic [ref=e473]: Meccan
          - generic [ref=e474]:
            - generic [ref=e475]: 34 Verses
            - generic [ref=e476]: Page 411
        - link "32 As-Sajdah Meccan 30 Verses Page 415" [ref=e477] [cursor=pointer]:
          - /url: /en/pages/415
          - generic [ref=e478]:
            - generic [ref=e479]:
              - img [ref=e480]
              - generic [ref=e483]: "32"
            - generic [ref=e485]: As-Sajdah
            - generic [ref=e486]: Meccan
          - generic [ref=e487]:
            - generic [ref=e488]: 30 Verses
            - generic [ref=e489]: Page 415
        - link "33 Al-Ahzab Medinan 73 Verses Page 418" [ref=e490] [cursor=pointer]:
          - /url: /en/pages/418
          - generic [ref=e491]:
            - generic [ref=e492]:
              - img [ref=e493]
              - generic [ref=e496]: "33"
            - generic [ref=e498]: Al-Ahzab
            - generic [ref=e499]: Medinan
          - generic [ref=e500]:
            - generic [ref=e501]: 73 Verses
            - generic [ref=e502]: Page 418
        - link "34 Saba Meccan 54 Verses Page 428" [ref=e503] [cursor=pointer]:
          - /url: /en/pages/428
          - generic [ref=e504]:
            - generic [ref=e505]:
              - img [ref=e506]
              - generic [ref=e509]: "34"
            - generic [ref=e511]: Saba
            - generic [ref=e512]: Meccan
          - generic [ref=e513]:
            - generic [ref=e514]: 54 Verses
            - generic [ref=e515]: Page 428
        - link "35 Fatir Meccan 45 Verses Page 434" [ref=e516] [cursor=pointer]:
          - /url: /en/pages/434
          - generic [ref=e517]:
            - generic [ref=e518]:
              - img [ref=e519]
              - generic [ref=e522]: "35"
            - generic [ref=e524]: Fatir
            - generic [ref=e525]: Meccan
          - generic [ref=e526]:
            - generic [ref=e527]: 45 Verses
            - generic [ref=e528]: Page 434
        - link "36 Ya-Sin Meccan 83 Verses Page 440" [ref=e529] [cursor=pointer]:
          - /url: /en/pages/440
          - generic [ref=e530]:
            - generic [ref=e531]:
              - img [ref=e532]
              - generic [ref=e535]: "36"
            - generic [ref=e537]: Ya-Sin
            - generic [ref=e538]: Meccan
          - generic [ref=e539]:
            - generic [ref=e540]: 83 Verses
            - generic [ref=e541]: Page 440
        - link "37 As-Saffat Meccan 182 Verses Page 446" [ref=e542] [cursor=pointer]:
          - /url: /en/pages/446
          - generic [ref=e543]:
            - generic [ref=e544]:
              - img [ref=e545]
              - generic [ref=e548]: "37"
            - generic [ref=e550]: As-Saffat
            - generic [ref=e551]: Meccan
          - generic [ref=e552]:
            - generic [ref=e553]: 182 Verses
            - generic [ref=e554]: Page 446
        - link "38 Sad Meccan 88 Verses Page 453" [ref=e555] [cursor=pointer]:
          - /url: /en/pages/453
          - generic [ref=e556]:
            - generic [ref=e557]:
              - img [ref=e558]
              - generic [ref=e561]: "38"
            - generic [ref=e563]: Sad
            - generic [ref=e564]: Meccan
          - generic [ref=e565]:
            - generic [ref=e566]: 88 Verses
            - generic [ref=e567]: Page 453
        - link "39 Az-Zumar Meccan 75 Verses Page 458" [ref=e568] [cursor=pointer]:
          - /url: /en/pages/458
          - generic [ref=e569]:
            - generic [ref=e570]:
              - img [ref=e571]
              - generic [ref=e574]: "39"
            - generic [ref=e576]: Az-Zumar
            - generic [ref=e577]: Meccan
          - generic [ref=e578]:
            - generic [ref=e579]: 75 Verses
            - generic [ref=e580]: Page 458
        - link "40 Ghafir Meccan 85 Verses Page 467" [ref=e581] [cursor=pointer]:
          - /url: /en/pages/467
          - generic [ref=e582]:
            - generic [ref=e583]:
              - img [ref=e584]
              - generic [ref=e587]: "40"
            - generic [ref=e589]: Ghafir
            - generic [ref=e590]: Meccan
          - generic [ref=e591]:
            - generic [ref=e592]: 85 Verses
            - generic [ref=e593]: Page 467
        - link "41 Fussilat Meccan 54 Verses Page 477" [ref=e594] [cursor=pointer]:
          - /url: /en/pages/477
          - generic [ref=e595]:
            - generic [ref=e596]:
              - img [ref=e597]
              - generic [ref=e600]: "41"
            - generic [ref=e602]: Fussilat
            - generic [ref=e603]: Meccan
          - generic [ref=e604]:
            - generic [ref=e605]: 54 Verses
            - generic [ref=e606]: Page 477
        - link "42 Ash-Shuraa Meccan 53 Verses Page 483" [ref=e607] [cursor=pointer]:
          - /url: /en/pages/483
          - generic [ref=e608]:
            - generic [ref=e609]:
              - img [ref=e610]
              - generic [ref=e613]: "42"
            - generic [ref=e615]: Ash-Shuraa
            - generic [ref=e616]: Meccan
          - generic [ref=e617]:
            - generic [ref=e618]: 53 Verses
            - generic [ref=e619]: Page 483
        - link "43 Az-Zukhruf Meccan 89 Verses Page 489" [ref=e620] [cursor=pointer]:
          - /url: /en/pages/489
          - generic [ref=e621]:
            - generic [ref=e622]:
              - img [ref=e623]
              - generic [ref=e626]: "43"
            - generic [ref=e628]: Az-Zukhruf
            - generic [ref=e629]: Meccan
          - generic [ref=e630]:
            - generic [ref=e631]: 89 Verses
            - generic [ref=e632]: Page 489
        - link "44 Ad-Dukhan Meccan 59 Verses Page 496" [ref=e633] [cursor=pointer]:
          - /url: /en/pages/496
          - generic [ref=e634]:
            - generic [ref=e635]:
              - img [ref=e636]
              - generic [ref=e639]: "44"
            - generic [ref=e641]: Ad-Dukhan
            - generic [ref=e642]: Meccan
          - generic [ref=e643]:
            - generic [ref=e644]: 59 Verses
            - generic [ref=e645]: Page 496
        - link "45 Al-Jathiyah Meccan 37 Verses Page 499" [ref=e646] [cursor=pointer]:
          - /url: /en/pages/499
          - generic [ref=e647]:
            - generic [ref=e648]:
              - img [ref=e649]
              - generic [ref=e652]: "45"
            - generic [ref=e654]: Al-Jathiyah
            - generic [ref=e655]: Meccan
          - generic [ref=e656]:
            - generic [ref=e657]: 37 Verses
            - generic [ref=e658]: Page 499
        - link "46 Al-Ahqaf Meccan 35 Verses Page 502" [ref=e659] [cursor=pointer]:
          - /url: /en/pages/502
          - generic [ref=e660]:
            - generic [ref=e661]:
              - img [ref=e662]
              - generic [ref=e665]: "46"
            - generic [ref=e667]: Al-Ahqaf
            - generic [ref=e668]: Meccan
          - generic [ref=e669]:
            - generic [ref=e670]: 35 Verses
            - generic [ref=e671]: Page 502
        - link "47 Muhammad Medinan 38 Verses Page 507" [ref=e672] [cursor=pointer]:
          - /url: /en/pages/507
          - generic [ref=e673]:
            - generic [ref=e674]:
              - img [ref=e675]
              - generic [ref=e678]: "47"
            - generic [ref=e680]: Muhammad
            - generic [ref=e681]: Medinan
          - generic [ref=e682]:
            - generic [ref=e683]: 38 Verses
            - generic [ref=e684]: Page 507
        - link "48 Al-Fath Medinan 29 Verses Page 511" [ref=e685] [cursor=pointer]:
          - /url: /en/pages/511
          - generic [ref=e686]:
            - generic [ref=e687]:
              - img [ref=e688]
              - generic [ref=e691]: "48"
            - generic [ref=e693]: Al-Fath
            - generic [ref=e694]: Medinan
          - generic [ref=e695]:
            - generic [ref=e696]: 29 Verses
            - generic [ref=e697]: Page 511
        - link "49 Al-Hujurat Medinan 18 Verses Page 515" [ref=e698] [cursor=pointer]:
          - /url: /en/pages/515
          - generic [ref=e699]:
            - generic [ref=e700]:
              - img [ref=e701]
              - generic [ref=e704]: "49"
            - generic [ref=e706]: Al-Hujurat
            - generic [ref=e707]: Medinan
          - generic [ref=e708]:
            - generic [ref=e709]: 18 Verses
            - generic [ref=e710]: Page 515
        - link "50 Qaf Meccan 45 Verses Page 518" [ref=e711] [cursor=pointer]:
          - /url: /en/pages/518
          - generic [ref=e712]:
            - generic [ref=e713]:
              - img [ref=e714]
              - generic [ref=e717]: "50"
            - generic [ref=e719]: Qaf
            - generic [ref=e720]: Meccan
          - generic [ref=e721]:
            - generic [ref=e722]: 45 Verses
            - generic [ref=e723]: Page 518
        - link "51 Adh-Dhariyat Meccan 60 Verses Page 520" [ref=e724] [cursor=pointer]:
          - /url: /en/pages/520
          - generic [ref=e725]:
            - generic [ref=e726]:
              - img [ref=e727]
              - generic [ref=e730]: "51"
            - generic [ref=e732]: Adh-Dhariyat
            - generic [ref=e733]: Meccan
          - generic [ref=e734]:
            - generic [ref=e735]: 60 Verses
            - generic [ref=e736]: Page 520
        - link "52 At-Tur Meccan 49 Verses Page 523" [ref=e737] [cursor=pointer]:
          - /url: /en/pages/523
          - generic [ref=e738]:
            - generic [ref=e739]:
              - img [ref=e740]
              - generic [ref=e743]: "52"
            - generic [ref=e745]: At-Tur
            - generic [ref=e746]: Meccan
          - generic [ref=e747]:
            - generic [ref=e748]: 49 Verses
            - generic [ref=e749]: Page 523
        - link "53 An-Najm Meccan 62 Verses Page 526" [ref=e750] [cursor=pointer]:
          - /url: /en/pages/526
          - generic [ref=e751]:
            - generic [ref=e752]:
              - img [ref=e753]
              - generic [ref=e756]: "53"
            - generic [ref=e758]: An-Najm
            - generic [ref=e759]: Meccan
          - generic [ref=e760]:
            - generic [ref=e761]: 62 Verses
            - generic [ref=e762]: Page 526
        - link "54 Al-Qamar Meccan 55 Verses Page 528" [ref=e763] [cursor=pointer]:
          - /url: /en/pages/528
          - generic [ref=e764]:
            - generic [ref=e765]:
              - img [ref=e766]
              - generic [ref=e769]: "54"
            - generic [ref=e771]: Al-Qamar
            - generic [ref=e772]: Meccan
          - generic [ref=e773]:
            - generic [ref=e774]: 55 Verses
            - generic [ref=e775]: Page 528
        - link "55 Ar-Rahman Medinan 78 Verses Page 531" [ref=e776] [cursor=pointer]:
          - /url: /en/pages/531
          - generic [ref=e777]:
            - generic [ref=e778]:
              - img [ref=e779]
              - generic [ref=e782]: "55"
            - generic [ref=e784]: Ar-Rahman
            - generic [ref=e785]: Medinan
          - generic [ref=e786]:
            - generic [ref=e787]: 78 Verses
            - generic [ref=e788]: Page 531
        - link "56 Al-Waqi'ah Meccan 96 Verses Page 534" [ref=e789] [cursor=pointer]:
          - /url: /en/pages/534
          - generic [ref=e790]:
            - generic [ref=e791]:
              - img [ref=e792]
              - generic [ref=e795]: "56"
            - generic [ref=e797]: Al-Waqi'ah
            - generic [ref=e798]: Meccan
          - generic [ref=e799]:
            - generic [ref=e800]: 96 Verses
            - generic [ref=e801]: Page 534
        - link "57 Al-Hadid Medinan 29 Verses Page 537" [ref=e802] [cursor=pointer]:
          - /url: /en/pages/537
          - generic [ref=e803]:
            - generic [ref=e804]:
              - img [ref=e805]
              - generic [ref=e808]: "57"
            - generic [ref=e810]: Al-Hadid
            - generic [ref=e811]: Medinan
          - generic [ref=e812]:
            - generic [ref=e813]: 29 Verses
            - generic [ref=e814]: Page 537
        - link "58 Al-Mujadila Medinan 22 Verses Page 542" [ref=e815] [cursor=pointer]:
          - /url: /en/pages/542
          - generic [ref=e816]:
            - generic [ref=e817]:
              - img [ref=e818]
              - generic [ref=e821]: "58"
            - generic [ref=e823]: Al-Mujadila
            - generic [ref=e824]: Medinan
          - generic [ref=e825]:
            - generic [ref=e826]: 22 Verses
            - generic [ref=e827]: Page 542
        - link "59 Al-Hashr Medinan 24 Verses Page 545" [ref=e828] [cursor=pointer]:
          - /url: /en/pages/545
          - generic [ref=e829]:
            - generic [ref=e830]:
              - img [ref=e831]
              - generic [ref=e834]: "59"
            - generic [ref=e836]: Al-Hashr
            - generic [ref=e837]: Medinan
          - generic [ref=e838]:
            - generic [ref=e839]: 24 Verses
            - generic [ref=e840]: Page 545
        - link "60 Al-Mumtahanah Medinan 13 Verses Page 549" [ref=e841] [cursor=pointer]:
          - /url: /en/pages/549
          - generic [ref=e842]:
            - generic [ref=e843]:
              - img [ref=e844]
              - generic [ref=e847]: "60"
            - generic [ref=e849]: Al-Mumtahanah
            - generic [ref=e850]: Medinan
          - generic [ref=e851]:
            - generic [ref=e852]: 13 Verses
            - generic [ref=e853]: Page 549
        - link "61 As-Saf Medinan 14 Verses Page 551" [ref=e854] [cursor=pointer]:
          - /url: /en/pages/551
          - generic [ref=e855]:
            - generic [ref=e856]:
              - img [ref=e857]
              - generic [ref=e860]: "61"
            - generic [ref=e862]: As-Saf
            - generic [ref=e863]: Medinan
          - generic [ref=e864]:
            - generic [ref=e865]: 14 Verses
            - generic [ref=e866]: Page 551
        - link "62 Al-Jumu'ah Medinan 11 Verses Page 553" [ref=e867] [cursor=pointer]:
          - /url: /en/pages/553
          - generic [ref=e868]:
            - generic [ref=e869]:
              - img [ref=e870]
              - generic [ref=e873]: "62"
            - generic [ref=e875]: Al-Jumu'ah
            - generic [ref=e876]: Medinan
          - generic [ref=e877]:
            - generic [ref=e878]: 11 Verses
            - generic [ref=e879]: Page 553
        - link "63 Al-Munafiqun Medinan 11 Verses Page 554" [ref=e880] [cursor=pointer]:
          - /url: /en/pages/554
          - generic [ref=e881]:
            - generic [ref=e882]:
              - img [ref=e883]
              - generic [ref=e886]: "63"
            - generic [ref=e888]: Al-Munafiqun
            - generic [ref=e889]: Medinan
          - generic [ref=e890]:
            - generic [ref=e891]: 11 Verses
            - generic [ref=e892]: Page 554
        - link "64 At-Taghabun Medinan 18 Verses Page 556" [ref=e893] [cursor=pointer]:
          - /url: /en/pages/556
          - generic [ref=e894]:
            - generic [ref=e895]:
              - img [ref=e896]
              - generic [ref=e899]: "64"
            - generic [ref=e901]: At-Taghabun
            - generic [ref=e902]: Medinan
          - generic [ref=e903]:
            - generic [ref=e904]: 18 Verses
            - generic [ref=e905]: Page 556
        - link "65 At-Talaq Medinan 12 Verses Page 558" [ref=e906] [cursor=pointer]:
          - /url: /en/pages/558
          - generic [ref=e907]:
            - generic [ref=e908]:
              - img [ref=e909]
              - generic [ref=e912]: "65"
            - generic [ref=e914]: At-Talaq
            - generic [ref=e915]: Medinan
          - generic [ref=e916]:
            - generic [ref=e917]: 12 Verses
            - generic [ref=e918]: Page 558
        - link "66 At-Tahrim Medinan 12 Verses Page 560" [ref=e919] [cursor=pointer]:
          - /url: /en/pages/560
          - generic [ref=e920]:
            - generic [ref=e921]:
              - img [ref=e922]
              - generic [ref=e925]: "66"
            - generic [ref=e927]: At-Tahrim
            - generic [ref=e928]: Medinan
          - generic [ref=e929]:
            - generic [ref=e930]: 12 Verses
            - generic [ref=e931]: Page 560
        - link "67 Al-Mulk Meccan 30 Verses Page 562" [ref=e932] [cursor=pointer]:
          - /url: /en/pages/562
          - generic [ref=e933]:
            - generic [ref=e934]:
              - img [ref=e935]
              - generic [ref=e938]: "67"
            - generic [ref=e940]: Al-Mulk
            - generic [ref=e941]: Meccan
          - generic [ref=e942]:
            - generic [ref=e943]: 30 Verses
            - generic [ref=e944]: Page 562
        - link "68 Al-Qalam Meccan 52 Verses Page 564" [ref=e945] [cursor=pointer]:
          - /url: /en/pages/564
          - generic [ref=e946]:
            - generic [ref=e947]:
              - img [ref=e948]
              - generic [ref=e951]: "68"
            - generic [ref=e953]: Al-Qalam
            - generic [ref=e954]: Meccan
          - generic [ref=e955]:
            - generic [ref=e956]: 52 Verses
            - generic [ref=e957]: Page 564
        - link "69 Al-Haqqah Meccan 52 Verses Page 566" [ref=e958] [cursor=pointer]:
          - /url: /en/pages/566
          - generic [ref=e959]:
            - generic [ref=e960]:
              - img [ref=e961]
              - generic [ref=e964]: "69"
            - generic [ref=e966]: Al-Haqqah
            - generic [ref=e967]: Meccan
          - generic [ref=e968]:
            - generic [ref=e969]: 52 Verses
            - generic [ref=e970]: Page 566
        - link "70 Al-Ma'arij Meccan 44 Verses Page 568" [ref=e971] [cursor=pointer]:
          - /url: /en/pages/568
          - generic [ref=e972]:
            - generic [ref=e973]:
              - img [ref=e974]
              - generic [ref=e977]: "70"
            - generic [ref=e979]: Al-Ma'arij
            - generic [ref=e980]: Meccan
          - generic [ref=e981]:
            - generic [ref=e982]: 44 Verses
            - generic [ref=e983]: Page 568
        - link "71 Nuh Meccan 28 Verses Page 570" [ref=e984] [cursor=pointer]:
          - /url: /en/pages/570
          - generic [ref=e985]:
            - generic [ref=e986]:
              - img [ref=e987]
              - generic [ref=e990]: "71"
            - generic [ref=e992]: Nuh
            - generic [ref=e993]: Meccan
          - generic [ref=e994]:
            - generic [ref=e995]: 28 Verses
            - generic [ref=e996]: Page 570
        - link "72 Al-Jinn Meccan 28 Verses Page 572" [ref=e997] [cursor=pointer]:
          - /url: /en/pages/572
          - generic [ref=e998]:
            - generic [ref=e999]:
              - img [ref=e1000]
              - generic [ref=e1003]: "72"
            - generic [ref=e1005]: Al-Jinn
            - generic [ref=e1006]: Meccan
          - generic [ref=e1007]:
            - generic [ref=e1008]: 28 Verses
            - generic [ref=e1009]: Page 572
        - link "73 Al-Muzzammil Meccan 20 Verses Page 574" [ref=e1010] [cursor=pointer]:
          - /url: /en/pages/574
          - generic [ref=e1011]:
            - generic [ref=e1012]:
              - img [ref=e1013]
              - generic [ref=e1016]: "73"
            - generic [ref=e1018]: Al-Muzzammil
            - generic [ref=e1019]: Meccan
          - generic [ref=e1020]:
            - generic [ref=e1021]: 20 Verses
            - generic [ref=e1022]: Page 574
        - link "74 Al-Muddaththir Meccan 56 Verses Page 575" [ref=e1023] [cursor=pointer]:
          - /url: /en/pages/575
          - generic [ref=e1024]:
            - generic [ref=e1025]:
              - img [ref=e1026]
              - generic [ref=e1029]: "74"
            - generic [ref=e1031]: Al-Muddaththir
            - generic [ref=e1032]: Meccan
          - generic [ref=e1033]:
            - generic [ref=e1034]: 56 Verses
            - generic [ref=e1035]: Page 575
        - link "75 Al-Qiyamah Meccan 40 Verses Page 577" [ref=e1036] [cursor=pointer]:
          - /url: /en/pages/577
          - generic [ref=e1037]:
            - generic [ref=e1038]:
              - img [ref=e1039]
              - generic [ref=e1042]: "75"
            - generic [ref=e1044]: Al-Qiyamah
            - generic [ref=e1045]: Meccan
          - generic [ref=e1046]:
            - generic [ref=e1047]: 40 Verses
            - generic [ref=e1048]: Page 577
        - link "76 Al-Insan Medinan 31 Verses Page 578" [ref=e1049] [cursor=pointer]:
          - /url: /en/pages/578
          - generic [ref=e1050]:
            - generic [ref=e1051]:
              - img [ref=e1052]
              - generic [ref=e1055]: "76"
            - generic [ref=e1057]: Al-Insan
            - generic [ref=e1058]: Medinan
          - generic [ref=e1059]:
            - generic [ref=e1060]: 31 Verses
            - generic [ref=e1061]: Page 578
        - link "77 Al-Mursalat Meccan 50 Verses Page 580" [ref=e1062] [cursor=pointer]:
          - /url: /en/pages/580
          - generic [ref=e1063]:
            - generic [ref=e1064]:
              - img [ref=e1065]
              - generic [ref=e1068]: "77"
            - generic [ref=e1070]: Al-Mursalat
            - generic [ref=e1071]: Meccan
          - generic [ref=e1072]:
            - generic [ref=e1073]: 50 Verses
            - generic [ref=e1074]: Page 580
        - link "78 An-Naba Meccan 40 Verses Page 582" [ref=e1075] [cursor=pointer]:
          - /url: /en/pages/582
          - generic [ref=e1076]:
            - generic [ref=e1077]:
              - img [ref=e1078]
              - generic [ref=e1081]: "78"
            - generic [ref=e1083]: An-Naba
            - generic [ref=e1084]: Meccan
          - generic [ref=e1085]:
            - generic [ref=e1086]: 40 Verses
            - generic [ref=e1087]: Page 582
        - link "79 An-Nazi'at Meccan 46 Verses Page 583" [ref=e1088] [cursor=pointer]:
          - /url: /en/pages/583
          - generic [ref=e1089]:
            - generic [ref=e1090]:
              - img [ref=e1091]
              - generic [ref=e1094]: "79"
            - generic [ref=e1096]: An-Nazi'at
            - generic [ref=e1097]: Meccan
          - generic [ref=e1098]:
            - generic [ref=e1099]: 46 Verses
            - generic [ref=e1100]: Page 583
        - link "80 'Abasa Meccan 42 Verses Page 585" [ref=e1101] [cursor=pointer]:
          - /url: /en/pages/585
          - generic [ref=e1102]:
            - generic [ref=e1103]:
              - img [ref=e1104]
              - generic [ref=e1107]: "80"
            - generic [ref=e1109]: "'Abasa"
            - generic [ref=e1110]: Meccan
          - generic [ref=e1111]:
            - generic [ref=e1112]: 42 Verses
            - generic [ref=e1113]: Page 585
        - link "81 At-Takwir Meccan 29 Verses Page 586" [ref=e1114] [cursor=pointer]:
          - /url: /en/pages/586
          - generic [ref=e1115]:
            - generic [ref=e1116]:
              - img [ref=e1117]
              - generic [ref=e1120]: "81"
            - generic [ref=e1122]: At-Takwir
            - generic [ref=e1123]: Meccan
          - generic [ref=e1124]:
            - generic [ref=e1125]: 29 Verses
            - generic [ref=e1126]: Page 586
        - link "82 Al-Infitar Meccan 19 Verses Page 587" [ref=e1127] [cursor=pointer]:
          - /url: /en/pages/587
          - generic [ref=e1128]:
            - generic [ref=e1129]:
              - img [ref=e1130]
              - generic [ref=e1133]: "82"
            - generic [ref=e1135]: Al-Infitar
            - generic [ref=e1136]: Meccan
          - generic [ref=e1137]:
            - generic [ref=e1138]: 19 Verses
            - generic [ref=e1139]: Page 587
        - link "83 Al-Mutaffifin Meccan 36 Verses Page 587" [ref=e1140] [cursor=pointer]:
          - /url: /en/pages/587
          - generic [ref=e1141]:
            - generic [ref=e1142]:
              - img [ref=e1143]
              - generic [ref=e1146]: "83"
            - generic [ref=e1148]: Al-Mutaffifin
            - generic [ref=e1149]: Meccan
          - generic [ref=e1150]:
            - generic [ref=e1151]: 36 Verses
            - generic [ref=e1152]: Page 587
        - link "84 Al-Inshiqaq Meccan 25 Verses Page 589" [ref=e1153] [cursor=pointer]:
          - /url: /en/pages/589
          - generic [ref=e1154]:
            - generic [ref=e1155]:
              - img [ref=e1156]
              - generic [ref=e1159]: "84"
            - generic [ref=e1161]: Al-Inshiqaq
            - generic [ref=e1162]: Meccan
          - generic [ref=e1163]:
            - generic [ref=e1164]: 25 Verses
            - generic [ref=e1165]: Page 589
        - link "85 Al-Buruj Meccan 22 Verses Page 590" [ref=e1166] [cursor=pointer]:
          - /url: /en/pages/590
          - generic [ref=e1167]:
            - generic [ref=e1168]:
              - img [ref=e1169]
              - generic [ref=e1172]: "85"
            - generic [ref=e1174]: Al-Buruj
            - generic [ref=e1175]: Meccan
          - generic [ref=e1176]:
            - generic [ref=e1177]: 22 Verses
            - generic [ref=e1178]: Page 590
        - link "86 At-Tariq Meccan 17 Verses Page 591" [ref=e1179] [cursor=pointer]:
          - /url: /en/pages/591
          - generic [ref=e1180]:
            - generic [ref=e1181]:
              - img [ref=e1182]
              - generic [ref=e1185]: "86"
            - generic [ref=e1187]: At-Tariq
            - generic [ref=e1188]: Meccan
          - generic [ref=e1189]:
            - generic [ref=e1190]: 17 Verses
            - generic [ref=e1191]: Page 591
        - link "87 Al-A'la Meccan 19 Verses Page 591" [ref=e1192] [cursor=pointer]:
          - /url: /en/pages/591
          - generic [ref=e1193]:
            - generic [ref=e1194]:
              - img [ref=e1195]
              - generic [ref=e1198]: "87"
            - generic [ref=e1200]: Al-A'la
            - generic [ref=e1201]: Meccan
          - generic [ref=e1202]:
            - generic [ref=e1203]: 19 Verses
            - generic [ref=e1204]: Page 591
        - link "88 Al-Ghashiyah Meccan 26 Verses Page 592" [ref=e1205] [cursor=pointer]:
          - /url: /en/pages/592
          - generic [ref=e1206]:
            - generic [ref=e1207]:
              - img [ref=e1208]
              - generic [ref=e1211]: "88"
            - generic [ref=e1213]: Al-Ghashiyah
            - generic [ref=e1214]: Meccan
          - generic [ref=e1215]:
            - generic [ref=e1216]: 26 Verses
            - generic [ref=e1217]: Page 592
        - link "89 Al-Fajr Meccan 30 Verses Page 593" [ref=e1218] [cursor=pointer]:
          - /url: /en/pages/593
          - generic [ref=e1219]:
            - generic [ref=e1220]:
              - img [ref=e1221]
              - generic [ref=e1224]: "89"
            - generic [ref=e1226]: Al-Fajr
            - generic [ref=e1227]: Meccan
          - generic [ref=e1228]:
            - generic [ref=e1229]: 30 Verses
            - generic [ref=e1230]: Page 593
        - link "90 Al-Balad Meccan 20 Verses Page 594" [ref=e1231] [cursor=pointer]:
          - /url: /en/pages/594
          - generic [ref=e1232]:
            - generic [ref=e1233]:
              - img [ref=e1234]
              - generic [ref=e1237]: "90"
            - generic [ref=e1239]: Al-Balad
            - generic [ref=e1240]: Meccan
          - generic [ref=e1241]:
            - generic [ref=e1242]: 20 Verses
            - generic [ref=e1243]: Page 594
        - link "91 Ash-Shams Meccan 15 Verses Page 595" [ref=e1244] [cursor=pointer]:
          - /url: /en/pages/595
          - generic [ref=e1245]:
            - generic [ref=e1246]:
              - img [ref=e1247]
              - generic [ref=e1250]: "91"
            - generic [ref=e1252]: Ash-Shams
            - generic [ref=e1253]: Meccan
          - generic [ref=e1254]:
            - generic [ref=e1255]: 15 Verses
            - generic [ref=e1256]: Page 595
        - link "92 Al-Layl Meccan 21 Verses Page 595" [ref=e1257] [cursor=pointer]:
          - /url: /en/pages/595
          - generic [ref=e1258]:
            - generic [ref=e1259]:
              - img [ref=e1260]
              - generic [ref=e1263]: "92"
            - generic [ref=e1265]: Al-Layl
            - generic [ref=e1266]: Meccan
          - generic [ref=e1267]:
            - generic [ref=e1268]: 21 Verses
            - generic [ref=e1269]: Page 595
        - link "93 Ad-Duhaa Meccan 11 Verses Page 596" [ref=e1270] [cursor=pointer]:
          - /url: /en/pages/596
          - generic [ref=e1271]:
            - generic [ref=e1272]:
              - img [ref=e1273]
              - generic [ref=e1276]: "93"
            - generic [ref=e1278]: Ad-Duhaa
            - generic [ref=e1279]: Meccan
          - generic [ref=e1280]:
            - generic [ref=e1281]: 11 Verses
            - generic [ref=e1282]: Page 596
        - link "94 Ash-Sharh Meccan 8 Verses Page 596" [ref=e1283] [cursor=pointer]:
          - /url: /en/pages/596
          - generic [ref=e1284]:
            - generic [ref=e1285]:
              - img [ref=e1286]
              - generic [ref=e1289]: "94"
            - generic [ref=e1291]: Ash-Sharh
            - generic [ref=e1292]: Meccan
          - generic [ref=e1293]:
            - generic [ref=e1294]: 8 Verses
            - generic [ref=e1295]: Page 596
        - link "95 At-Tin Meccan 8 Verses Page 597" [ref=e1296] [cursor=pointer]:
          - /url: /en/pages/597
          - generic [ref=e1297]:
            - generic [ref=e1298]:
              - img [ref=e1299]
              - generic [ref=e1302]: "95"
            - generic [ref=e1304]: At-Tin
            - generic [ref=e1305]: Meccan
          - generic [ref=e1306]:
            - generic [ref=e1307]: 8 Verses
            - generic [ref=e1308]: Page 597
        - link "96 Al-'Alaq Meccan 19 Verses Page 597" [ref=e1309] [cursor=pointer]:
          - /url: /en/pages/597
          - generic [ref=e1310]:
            - generic [ref=e1311]:
              - img [ref=e1312]
              - generic [ref=e1315]: "96"
            - generic [ref=e1317]: Al-'Alaq
            - generic [ref=e1318]: Meccan
          - generic [ref=e1319]:
            - generic [ref=e1320]: 19 Verses
            - generic [ref=e1321]: Page 597
        - link "97 Al-Qadr Meccan 5 Verses Page 598" [ref=e1322] [cursor=pointer]:
          - /url: /en/pages/598
          - generic [ref=e1323]:
            - generic [ref=e1324]:
              - img [ref=e1325]
              - generic [ref=e1328]: "97"
            - generic [ref=e1330]: Al-Qadr
            - generic [ref=e1331]: Meccan
          - generic [ref=e1332]:
            - generic [ref=e1333]: 5 Verses
            - generic [ref=e1334]: Page 598
        - link "98 Al-Bayyinah Medinan 8 Verses Page 598" [ref=e1335] [cursor=pointer]:
          - /url: /en/pages/598
          - generic [ref=e1336]:
            - generic [ref=e1337]:
              - img [ref=e1338]
              - generic [ref=e1341]: "98"
            - generic [ref=e1343]: Al-Bayyinah
            - generic [ref=e1344]: Medinan
          - generic [ref=e1345]:
            - generic [ref=e1346]: 8 Verses
            - generic [ref=e1347]: Page 598
        - link "99 Az-Zalzalah Medinan 8 Verses Page 599" [ref=e1348] [cursor=pointer]:
          - /url: /en/pages/599
          - generic [ref=e1349]:
            - generic [ref=e1350]:
              - img [ref=e1351]
              - generic [ref=e1354]: "99"
            - generic [ref=e1356]: Az-Zalzalah
            - generic [ref=e1357]: Medinan
          - generic [ref=e1358]:
            - generic [ref=e1359]: 8 Verses
            - generic [ref=e1360]: Page 599
        - link "100 Al-'Adiyat Meccan 11 Verses Page 599" [ref=e1361] [cursor=pointer]:
          - /url: /en/pages/599
          - generic [ref=e1362]:
            - generic [ref=e1363]:
              - img [ref=e1364]
              - generic [ref=e1367]: "100"
            - generic [ref=e1369]: Al-'Adiyat
            - generic [ref=e1370]: Meccan
          - generic [ref=e1371]:
            - generic [ref=e1372]: 11 Verses
            - generic [ref=e1373]: Page 599
        - link "101 Al-Qari'ah Meccan 11 Verses Page 600" [ref=e1374] [cursor=pointer]:
          - /url: /en/pages/600
          - generic [ref=e1375]:
            - generic [ref=e1376]:
              - img [ref=e1377]
              - generic [ref=e1380]: "101"
            - generic [ref=e1382]: Al-Qari'ah
            - generic [ref=e1383]: Meccan
          - generic [ref=e1384]:
            - generic [ref=e1385]: 11 Verses
            - generic [ref=e1386]: Page 600
        - link "102 At-Takathur Meccan 8 Verses Page 600" [ref=e1387] [cursor=pointer]:
          - /url: /en/pages/600
          - generic [ref=e1388]:
            - generic [ref=e1389]:
              - img [ref=e1390]
              - generic [ref=e1393]: "102"
            - generic [ref=e1395]: At-Takathur
            - generic [ref=e1396]: Meccan
          - generic [ref=e1397]:
            - generic [ref=e1398]: 8 Verses
            - generic [ref=e1399]: Page 600
        - link "103 Al-'Asr Meccan 3 Verses Page 601" [ref=e1400] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e1401]:
            - generic [ref=e1402]:
              - img [ref=e1403]
              - generic [ref=e1406]: "103"
            - generic [ref=e1408]: Al-'Asr
            - generic [ref=e1409]: Meccan
          - generic [ref=e1410]:
            - generic [ref=e1411]: 3 Verses
            - generic [ref=e1412]: Page 601
        - link "104 Al-Humazah Meccan 9 Verses Page 601" [ref=e1413] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e1414]:
            - generic [ref=e1415]:
              - img [ref=e1416]
              - generic [ref=e1419]: "104"
            - generic [ref=e1421]: Al-Humazah
            - generic [ref=e1422]: Meccan
          - generic [ref=e1423]:
            - generic [ref=e1424]: 9 Verses
            - generic [ref=e1425]: Page 601
        - link "105 Al-Fil Meccan 5 Verses Page 601" [ref=e1426] [cursor=pointer]:
          - /url: /en/pages/601
          - generic [ref=e1427]:
            - generic [ref=e1428]:
              - img [ref=e1429]
              - generic [ref=e1432]: "105"
            - generic [ref=e1434]: Al-Fil
            - generic [ref=e1435]: Meccan
          - generic [ref=e1436]:
            - generic [ref=e1437]: 5 Verses
            - generic [ref=e1438]: Page 601
        - link "106 Quraysh Meccan 4 Verses Page 602" [ref=e1439] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e1440]:
            - generic [ref=e1441]:
              - img [ref=e1442]
              - generic [ref=e1445]: "106"
            - generic [ref=e1447]: Quraysh
            - generic [ref=e1448]: Meccan
          - generic [ref=e1449]:
            - generic [ref=e1450]: 4 Verses
            - generic [ref=e1451]: Page 602
        - link "107 Al-Ma'un Meccan 7 Verses Page 602" [ref=e1452] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e1453]:
            - generic [ref=e1454]:
              - img [ref=e1455]
              - generic [ref=e1458]: "107"
            - generic [ref=e1460]: Al-Ma'un
            - generic [ref=e1461]: Meccan
          - generic [ref=e1462]:
            - generic [ref=e1463]: 7 Verses
            - generic [ref=e1464]: Page 602
        - link "108 Al-Kawthar Meccan 3 Verses Page 602" [ref=e1465] [cursor=pointer]:
          - /url: /en/pages/602
          - generic [ref=e1466]:
            - generic [ref=e1467]:
              - img [ref=e1468]
              - generic [ref=e1471]: "108"
            - generic [ref=e1473]: Al-Kawthar
            - generic [ref=e1474]: Meccan
          - generic [ref=e1475]:
            - generic [ref=e1476]: 3 Verses
            - generic [ref=e1477]: Page 602
        - link "109 Al-Kafirun Meccan 6 Verses Page 603" [ref=e1478] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e1479]:
            - generic [ref=e1480]:
              - img [ref=e1481]
              - generic [ref=e1484]: "109"
            - generic [ref=e1486]: Al-Kafirun
            - generic [ref=e1487]: Meccan
          - generic [ref=e1488]:
            - generic [ref=e1489]: 6 Verses
            - generic [ref=e1490]: Page 603
        - link "110 An-Nasr Medinan 3 Verses Page 603" [ref=e1491] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e1492]:
            - generic [ref=e1493]:
              - img [ref=e1494]
              - generic [ref=e1497]: "110"
            - generic [ref=e1499]: An-Nasr
            - generic [ref=e1500]: Medinan
          - generic [ref=e1501]:
            - generic [ref=e1502]: 3 Verses
            - generic [ref=e1503]: Page 603
        - link "111 Al-Masad Meccan 5 Verses Page 603" [ref=e1504] [cursor=pointer]:
          - /url: /en/pages/603
          - generic [ref=e1505]:
            - generic [ref=e1506]:
              - img [ref=e1507]
              - generic [ref=e1510]: "111"
            - generic [ref=e1512]: Al-Masad
            - generic [ref=e1513]: Meccan
          - generic [ref=e1514]:
            - generic [ref=e1515]: 5 Verses
            - generic [ref=e1516]: Page 603
        - link "112 Al-Ikhlas Meccan 4 Verses Page 604" [ref=e1517] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e1518]:
            - generic [ref=e1519]:
              - img [ref=e1520]
              - generic [ref=e1523]: "112"
            - generic [ref=e1525]: Al-Ikhlas
            - generic [ref=e1526]: Meccan
          - generic [ref=e1527]:
            - generic [ref=e1528]: 4 Verses
            - generic [ref=e1529]: Page 604
        - link "113 Al-Falaq Meccan 5 Verses Page 604" [ref=e1530] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e1531]:
            - generic [ref=e1532]:
              - img [ref=e1533]
              - generic [ref=e1536]: "113"
            - generic [ref=e1538]: Al-Falaq
            - generic [ref=e1539]: Meccan
          - generic [ref=e1540]:
            - generic [ref=e1541]: 5 Verses
            - generic [ref=e1542]: Page 604
        - link "114 An-Nas Meccan 6 Verses Page 604" [ref=e1543] [cursor=pointer]:
          - /url: /en/pages/604
          - generic [ref=e1544]:
            - generic [ref=e1545]:
              - img [ref=e1546]
              - generic [ref=e1549]: "114"
            - generic [ref=e1551]: An-Nas
            - generic [ref=e1552]: Meccan
          - generic [ref=e1553]:
            - generic [ref=e1554]: 6 Verses
            - generic [ref=e1555]: Page 604
  - alert [ref=e1556]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
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
  26  | // UserMenu trigger
  27  | const ACCOUNT_LABEL: Record<Locale, string> = {
  28  |   ar: "حسابي",
  29  |   en: "Account",
  30  | };
  31  | // The results dropdown's surah heading, which SearchQueryResults renders only
  32  | // once `chapters.length > 0` — so it cannot match before results exist. Matched
  33  | // by prefix because the count is rendered inside it as a localized numeral.
  34  | // Deliberately not a locator for the result row itself: the home page's own
  35  | // surah list renders each surah as a link with the same accessible name, so
  36  | // `getByRole("link", { name: "Al-Fatihah" })` would resolve against the list
  37  | // underneath the dropdown and pass before the search had rendered anything.
  38  | const SEARCH_RESULTS_HEADING: Record<Locale, RegExp> = {
  39  |   ar: /^السور \(/,
  40  |   en: /^Surahs \(/,
  41  | };
  42  | 
  43  | /** Sets the theme in localStorage before first paint, mirroring app/utils/storage.ts's JSON.stringify shape. */
  44  | async function withTheme(page: Page, theme: Theme) {
  45  |   await page.addInitScript((t) => {
  46  |     window.localStorage.setItem("theme", JSON.stringify(t));
  47  |   }, theme);
  48  | }
  49  | 
  50  | // Blocks until every mounted safha has painted its word rows.
  51  | //
  52  | // `toHaveScreenshot` decides a page has settled by comparing two screenshots
  53  | // 100ms apart — but it disables CSS animations first, which freezes the loading
  54  | // skeleton's `animate-pulse` and makes a half-loaded reader look like a settled
  55  | // one. Its only built-in readiness signal, `document.fonts.ready`, resolves long
  56  | // before the line content arrives (ADR 0034), so without this the captured frame
  57  | // is whichever of {skeleton, text} the runner happened to reach — measured at
  58  | // 4-in-8 runs, and the difference between the two lands right on the diff gate.
  59  | //
  60  | // This asserts content is PRESENT rather than that the skeleton is absent. A
  61  | // `no .animate-pulse` check returns an empty list — and so passes instantly —
  62  | // the moment that class is renamed, silently restoring the flake with no failing
  63  | // test to reveal it. The length guard is the same hazard one level up: `every()`
  64  | // on an empty list is vacuously true. See docs/plans/visual-e2e-testing.md
  65  | // Addendum (2026-08-02).
  66  | async function waitForReaderContent(page: Page) {
  67  |   await page.waitForFunction(() => {
  68  |     const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
  69  |     return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  70  |   });
  71  | }
  72  | 
  73  | for (const locale of LOCALES) {
  74  |   for (const theme of THEMES) {
  75  |     const suffix = `${locale}-${theme}`;
  76  | 
  77  |     test.describe(`home (${suffix})`, () => {
  78  |       test("surah list", async ({ page }) => {
  79  |         await withTheme(page, theme);
  80  |         await page.goto(`/${locale}`);
> 81  |         await expect(page).toHaveScreenshot(`home-${suffix}.png`);
      |                            ^ Error: expect(page).toHaveScreenshot(expected) failed
  82  |       });
  83  |     });
  84  | 
  85  |     test.describe(`quran page 1 (${suffix})`, () => {
  86  |       test("single page, short opening page", async ({ page }) => {
  87  |         await withTheme(page, theme);
  88  |         await page.goto(`/${locale}/pages/1`);
  89  |         await waitForReaderContent(page);
  90  |         await expect(page).toHaveScreenshot(`page-1-${suffix}.png`);
  91  |       });
  92  |     });
  93  | 
  94  |     test.describe(`quran pages 2-3 double-spread (${suffix})`, () => {
  95  |       test("double-page spread", async ({ page }, testInfo) => {
  96  |         test.skip(
  97  |           testInfo.project.name === "mobile",
  98  |           "double-page spread only renders at lg+ (ADR 0013) — nothing distinct to capture on mobile"
  99  |         );
  100 |         await withTheme(page, theme);
  101 |         await page.goto(`/${locale}/pages/2`);
  102 |         await waitForReaderContent(page);
  103 |         await expect(page).toHaveScreenshot(`spread-2-3-${suffix}.png`);
  104 |       });
  105 |     });
  106 | 
  107 |     test.describe(`search results (${suffix})`, () => {
  108 |       test("search for a chapter", async ({ page }) => {
  109 |         await withTheme(page, theme);
  110 |         await page.goto(`/${locale}`);
  111 | 
  112 |         // Search is a single icon trigger at every breakpoint (desktop no
  113 |         // longer has a persistent inline field — SearchBar.tsx,
  114 |         // docs/plans/desktop-navbar-font-bg.md) that opens the same
  115 |         // full-screen Sheet/dialog overlay on both desktop and mobile.
  116 |         await page.getByRole("button", { name: SEARCH_PLACEHOLDER[locale] }).click();
  117 |         const scope = page.getByRole("dialog");
  118 |         await scope.getByPlaceholder(SEARCH_PLACEHOLDER[locale]).fill(SEARCH_QUERY[locale]);
  119 | 
  120 |         // Positive wait on the rendered results rather than a fixed sleep: the
  121 |         // old `waitForTimeout(800)` left only ~300ms after the 500ms debounce for
  122 |         // the request and render, so the screenshot caught either the spinner or
  123 |         // the dropdown depending on timing — 2 of the 4 search snapshots differed
  124 |         // run-to-run at a ratio of ~0.05, well past the diff gate.
  125 |         await expect(scope.getByText(SEARCH_RESULTS_HEADING[locale])).toBeVisible();
  126 |         await expect(page).toHaveScreenshot(`search-${suffix}.png`);
  127 |       });
  128 |     });
  129 | 
  130 |     test.describe(`settings sheet (${suffix})`, () => {
  131 |       test("open settings sheet", async ({ page }, testInfo) => {
  132 |         await withTheme(page, theme);
  133 |         await page.goto(`/${locale}`);
  134 |         // Settings is in the nav row on desktop (as a button), but behind the UserMenu on mobile (as a menuitem).
  135 |         if (testInfo.project.name === "mobile") {
  136 |           await page.getByRole("button", { name: ACCOUNT_LABEL[locale] }).click();
  137 |           await page.getByRole("menuitem", { name: SETTINGS_LABEL[locale] }).click();
  138 |         } else {
  139 |           await page.getByRole("button", { name: SETTINGS_LABEL[locale] }).click();
  140 |         }
  141 |         // Sheet slide-in animation.
  142 |         await page.waitForTimeout(600);
  143 |         await expect(page).toHaveScreenshot(`settings-${suffix}.png`);
  144 |       });
  145 |     });
  146 |   }
  147 | }
  148 | 
```