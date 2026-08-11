import * as yup from 'yup'
import { toTypedSchema } from '@vee-validate/yup'

// 動作確認用の最小スキーマ。各画面の実バリデーションルールは specify-agent / plan-agent の
// ワークフローで画面ごとに定義する。
export const exampleFormSchema = toTypedSchema(
  yup.object({
    name: yup.string().required('名前を入力してください'),
  }),
)
