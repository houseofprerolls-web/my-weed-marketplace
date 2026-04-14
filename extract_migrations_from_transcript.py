import re
import pathlib


TRANSCRIPT_PATH = pathlib.Path(
    r"C:\Users\itssj\.cursor\projects\c-Users-itssj-my-weed-marketplace\agent-transcripts\33ba7055-deae-48ee-bfee-76f8716c5f49\33ba7055-deae-48ee-bfee-76f8716c5f49.jsonl"
)


def main() -> None:
    text = TRANSCRIPT_PATH.read_text(encoding="utf-8", errors="ignore")
    # Capture things like: supabase/migrations/0010_unified_access_notifications_and_view.sql
    pat = re.compile(r"supabase/migrations/(\d+_[^\s`\"']+?\.sql)")
    matches = pat.findall(text)
    uniq = sorted(set(matches))
    print(f"unique migration filenames: {len(uniq)}")
    for m in uniq:
        print(m)


if __name__ == "__main__":
    main()

