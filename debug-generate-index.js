const fs = require("fs")
const path = require("path")

// 顯示當前工作目錄
console.log("當前工作目錄:", process.cwd())

// 基礎目錄
const baseDir = "data"
// 輸出JSON文件路徑
const outputFile = path.join(baseDir, "index.json")

// 檢查基礎目錄是否存在
console.log(`檢查 ${baseDir} 目錄是否存在...`)
if (!fs.existsSync(baseDir)) {
  console.error(`錯誤: ${baseDir} 目錄不存在！`)
  console.log("請確保您在正確的目錄中運行此腳本，或者創建 data 目錄。")
  process.exit(1)
}

/**
 * 掃描目錄並生成映射
 * @param {string} dir 要掃描的目錄
 * @returns {Object} 目錄到文件的映射
 */
function scanDirectory(dir) {
  console.log(`掃描目錄: ${dir}`)

  // 獲取目錄中的所有項目
  let items
  try {
    items = fs.readdirSync(dir, { withFileTypes: true })
    console.log(`在 ${dir} 中找到 ${items.length} 個項目`)
  } catch (error) {
    console.error(`讀取目錄 ${dir} 時出錯:`, error.message)
    return {}
  }

  // 過濾出子目錄
  const directories = items.filter((item) => item.isDirectory()).map((item) => item.name)
  console.log(`在 ${dir} 中找到 ${directories.length} 個子目錄:`, directories)

  const result = {}

  // 處理每個子目錄
  for (const directory of directories) {
    const dirPath = path.join(dir, directory)
    console.log(`處理子目錄: ${dirPath}`)

    // 獲取目錄中的所有文件
    let files
    try {
      files = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((item) => item.isFile() && item.name.endsWith(".csv"))
        .map((item) => item.name)
      console.log(`在 ${dirPath} 中找到 ${files.length} 個CSV文件:`, files)
    } catch (error) {
      console.error(`讀取目錄 ${dirPath} 時出錯:`, error.message)
      continue
    }

    // 將目錄名稱映射到文件列表
    result[directory] = files
  }

  return result
}

/**
 * 主函數
 */
function main() {
  try {
    console.log(`開始掃描 ${baseDir} 目錄...`)

    // 掃描目錄並生成映射
    const mapping = scanDirectory(baseDir)

    // 檢查是否有找到任何目錄
    const dirCount = Object.keys(mapping).length
    if (dirCount === 0) {
      console.warn(`警告：在 ${baseDir} 中沒有找到任何子目錄或CSV文件！`)
      console.log("請確保您的目錄結構如下:")
      console.log("data/")
      console.log("├── US/")
      console.log("│   ├── SP500.csv")
      console.log("│   ├── NASDAQ.csv")
      console.log("│   └── DOW.csv")
      console.log("├── HK/")
      console.log("│   └── ...")
      console.log("└── ...")
    } else {
      console.log(`找到 ${dirCount} 個子目錄。`)

      // 將映射寫入JSON文件
      const jsonContent = JSON.stringify(mapping, null, 2)
      console.log("生成的JSON內容:")
      console.log(jsonContent)

      try {
        fs.writeFileSync(outputFile, jsonContent)
        console.log(`成功生成 ${outputFile} 文件！`)
      } catch (error) {
        console.error(`寫入文件 ${outputFile} 時出錯:`, error.message)
        console.log("請檢查您是否有寫入權限，或者目錄是否存在。")
      }

      // 顯示映射內容摘要
      for (const [dir, files] of Object.entries(mapping)) {
        console.log(`- ${dir}: ${files.length} 個文件`)
      }
    }
  } catch (error) {
    console.error("生成索引文件時發生錯誤：", error)
    process.exit(1)
  }
}

// 執行主函數
console.log("開始執行腳本...")
main()
console.log("腳本執行完成！")
