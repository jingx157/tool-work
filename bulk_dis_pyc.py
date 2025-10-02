import marshal, dis, sys, os

def find_code_object(path):
    with open(path, "rb") as f:
        data = f.read()

    # Try sliding window over the file to find a valid marshal stream
    for offset in range(8, 128):  # scan first 128 bytes
        try:
            code = marshal.loads(data[offset:])
            if hasattr(code, "co_code"):
                return code
        except Exception:
            continue
    raise ValueError("Could not locate a code object in %s" % path)

def disassemble_pyc(path, out_path):
    try:
        code = find_code_object(path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as outf:
            outf.write(f"### Disassembly of {path}\n\n")
            dis.dis(code, file=outf)
        print(f"[+] Disassembled {path} -> {out_path}")
    except Exception as e:
        print(f"[!] Failed {path}: {e}")

def walk_and_disassemble(root, outdir):
    if not os.path.exists(outdir):
        os.makedirs(outdir)
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            if fname.endswith(".pyc"):
                fullpath = os.path.join(dirpath, fname)
                relpath = os.path.relpath(fullpath, root)
                outpath = os.path.join(outdir, relpath + ".dis")
                disassemble_pyc(fullpath, outpath)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python bulk_dis_pyc.py <extracted_dir> <output_dir>")
        sys.exit(1)
    walk_and_disassemble(sys.argv[1], sys.argv[2])
