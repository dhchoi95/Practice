"""Regression checks for source freshness and non-prose immutability, not prose quality scores."""
import copy,importlib.util,json,unittest
from pathlib import Path
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('writing_merge',root/'scripts/writing_merge_rewrites.py')
merge=importlib.util.module_from_spec(spec);spec.loader.exec_module(merge)
class MergeContract(unittest.TestCase):
 def setUp(self):
  self.record=json.loads((root/'src/content/foundation/sectors.json').read_text())[0]
  self.change={'id':self.record['id'],'source_sha256':merge.digest(self.record),'patch':{'title':'교정 제목','paragraphs':['같은 의미를 편집한 검사용 문장입니다.'],'proposal':''}}
 def test_preserves_all_non_prose_and_source(self):
  original=copy.deepcopy(self.record);out=merge.validate([self.record],[self.change])[0]
  self.assertEqual(self.record,original)
  for key,value in original.items():
   if key not in self.change['patch']:self.assertEqual(out[key],value)
 def test_stale_hash_is_rejected(self):
  self.record['title']='다른 작업자가 먼저 바꾼 제목'
  with self.assertRaisesRegex(ValueError,'Source changed'):merge.validate([self.record],[self.change])
 def test_forbidden_score_field_is_rejected(self):
  self.change['patch']['contribution']={'delta':10,'group':'forced'}
  with self.assertRaisesRegex(ValueError,'Only title'):merge.validate([self.record],[self.change])
 def test_duplicate_proposal_is_rejected(self):
  with self.assertRaisesRegex(ValueError,'Duplicate change'):merge.validate([self.record],[self.change,self.change])
 def test_empty_paragraph_is_rejected(self):
  self.change['patch']['paragraphs']=[' ']
  with self.assertRaisesRegex(ValueError,'Empty or invalid paragraphs'):merge.validate([self.record],[self.change])
if __name__=='__main__':unittest.main()
