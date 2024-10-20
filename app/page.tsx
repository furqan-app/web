import axios from 'axios';
import { Verse, Word } from './types';
// 'https://api.qurancdn.com/api/qdc/verses/by_page/45?words=true&per_page=all&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&reciter=7&word_translation_language=en&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,qpc_uthmani_hafs&mushaf=2&filter_page_words=true&from=2:265&to=2:269'

const groupWordsByLine = (verses: Array<Verse>) => {
  const lines: { [key: string]: Array<Word> } = {}
  verses.forEach((verse) => {
    verse.words.forEach((word) => {
      if (!lines[word.line_number]) {
        lines[word.line_number] = []
      }
      lines[word.line_number].push(word)
    })
  })
  return lines
}

export default async function Home() {
  const { data } = await axios(
    'https://api.qurancdn.com/api/qdc/verses/by_page/45?words=true&per_page=all&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&reciter=7&word_translation_language=en&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,code_v2,code_v4,qpc_uthmani_hafs&mushaf=2&filter_page_words=true&from=2:265&to=2:269'
  )

  const lines = groupWordsByLine(data.verses)

  return (
    <div className='fq-wrapper max-h-screen h-screen overflow-auto w-full flex justify-center items-center font-[family-name:var(--font-page45-v1-ttf)]'>
      <div className='fq-page max-w-full'>
        {Object.keys(lines).map((line) => (
          <div
            key={line}
            className="text-white flex flex-row-reverse justify-between"
          >
            {lines[line].map((word) => (
              <span key={line + '' + word.id} className='text-[4.7vw] lg:text-[3.2vh] hover:text-yellow-300 cursor-pointer'>
                {word.code_v1}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
