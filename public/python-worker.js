// Web Worker Python (Pyodide). Dibuat dari python-runner; jangan diedit manual di sini.
// Output dikirim langsung per tulisan (live) dan input() menunggu balasan dari halaman.
const PYODIDE_VERSION = "0.26.4";
importScripts("https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/pyodide.js");

const PY_RUNNER = String.raw`import ast, sys, builtins, inspect, traceback
import pg

_SCOPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)


class _InputError(Exception):
    pass


def _walk_scope(node):
    # Semua node di dalam node, tanpa masuk ke fungsi/lambda bersarang.
    stack = list(ast.iter_child_nodes(node))
    while stack:
        n = stack.pop()
        yield n
        if not isinstance(n, _SCOPES):
            stack.extend(ast.iter_child_nodes(n))


def _is_input(c):
    return isinstance(c.func, ast.Name) and c.func.id == "input"


def _callee(c):
    f = c.func
    if isinstance(f, ast.Name):
        return f.id
    if isinstance(f, ast.Attribute):
        return f.attr
    return None


def _analyze(tree):
    funcs = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
    need, names = set(), set()
    changed = True
    while changed:
        changed = False
        for fn in funcs:
            if id(fn) in need:
                continue
            for n in _walk_scope(fn):
                if isinstance(n, ast.Call) and (_is_input(n) or _callee(n) in names):
                    need.add(id(fn))
                    names.add(fn.name)
                    changed = True
                    break
    for fn in funcs:
        if id(fn) not in need:
            continue
        if fn.name.startswith("__") and fn.name.endswith("__"):
            raise _InputError(f"input() tidak bisa dipakai di dalam {fn.name}(). Pindahkan input() ke fungsi biasa.")
        if any(isinstance(n, (ast.Yield, ast.YieldFrom)) for n in _walk_scope(fn)):
            raise _InputError(f"input() tidak bisa dipakai di dalam generator ({fn.name}).")
    for lam in ast.walk(tree):
        if isinstance(lam, ast.Lambda):
            for n in ast.walk(lam):
                if isinstance(n, ast.Call) and (_is_input(n) or _callee(n) in names):
                    raise _InputError("input() tidak bisa dipakai di dalam lambda. Pakai def biasa.")
    return need, names


class _Transform(ast.NodeTransformer):
    def __init__(self, need, names):
        self.need, self.names = need, names

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        if id(node) in self.need:
            node.__class__ = ast.AsyncFunctionDef
        return node

    def visit_GeneratorExp(self, node):
        self.generic_visit(node)
        if any(isinstance(n, ast.Await) for n in ast.walk(node)):
            # Generator yang berisi await jadi async generator; ubah ke list agar bisa dipakai biasa.
            lst = ast.ListComp(elt=node.elt, generators=node.generators)
            call = ast.Call(func=ast.Name(id="iter", ctx=ast.Load()), args=[lst], keywords=[])
            return ast.copy_location(call, node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if _is_input(node):
            node.func = ast.Name(id="_pg_input", ctx=ast.Load())
            return ast.copy_location(ast.Await(value=node), node)
        if _callee(node) in self.names:
            wrapped = ast.Call(func=ast.Name(id="_pg_aw", ctx=ast.Load()), args=[node], keywords=[])
            return ast.copy_location(ast.Await(value=wrapped), node)
        return node


def _compile(source, filename):
    tree = ast.parse(source, filename)
    need, names = _analyze(tree)
    tree = _Transform(need, names).visit(tree)
    ast.fix_missing_locations(tree)
    return compile(tree, filename, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)


async def _pg_aw(x):
    if inspect.isawaitable(x):
        return await x
    return x


async def _pg_input(prompt=""):
    if prompt != "":
        sys.stdout.write(str(prompt))
        sys.stdout.flush()
    return str(await pg.request_input())


def _print_error(e):
    if isinstance(e, _InputError):
        sys.stderr.write("Error: " + str(e) + "\n")
        return
    tb = e.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename in ("<exec>", "<pg-runner>"):
        tb = tb.tb_next
    if isinstance(e, SyntaxError):
        tb = None
    parts = []
    if tb is not None:
        parts.append("Traceback (most recent call last):\n")
        parts.extend(traceback.format_tb(tb))
    parts.extend(traceback.format_exception_only(type(e), e))
    sys.stderr.write("".join(parts))


async def pg_run(source, filename):
    ns = {
        "__name__": "__main__",
        "__file__": filename,
        "__builtins__": builtins,
        "_pg_input": _pg_input,
        "_pg_aw": _pg_aw,
    }
    try:
        res = eval(_compile(source, filename), ns)
        if inspect.isawaitable(res):
            await res
        return True
    except SystemExit:
        return True
    except BaseException as e:
        _print_error(e)
        return False
    finally:
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        except Exception:
            pass
`;

let pyodide = null;
let busy = false;
let inputResolver = null;

function makeWriter(stream) {
  const decoder = new TextDecoder();
  return {
    write: (buf) => {
      const data = decoder.decode(buf, { stream: true });
      if (data) postMessage({ type: "out", stream, data });
      return buf.length;
    },
    isatty: true,
  };
}

async function init() {
  if (pyodide) return;
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/" });
  pyodide.setStdout(makeWriter("stdout"));
  pyodide.setStderr(makeWriter("stderr"));
  pyodide.setStdin({ stdin: () => undefined });
  pyodide.registerJsModule("pg", {
    request_input: () =>
      new Promise((resolve) => {
        inputResolver = resolve;
        postMessage({ type: "need-input" });
      }),
  });
  pyodide.runPython(PY_RUNNER);
  pyodide.runPython("import sys\nfor s in (sys.stdout, sys.stderr):\n    try:\n        s.reconfigure(line_buffering=True, write_through=True)\n    except Exception:\n        pass");
}

function writeProject(files) {
  pyodide.runPython(
    "import os, sys, shutil\nshutil.rmtree('/proj', ignore_errors=True)\nos.makedirs('/proj', exist_ok=True)\nos.chdir('/proj')\nif '/proj' not in sys.path:\n    sys.path.insert(0, '/proj')\nfor _n, _m in list(sys.modules.items()):\n    _f = getattr(_m, '__file__', None)\n    if _f and str(_f).startswith('/proj/'):\n        del sys.modules[_n]",
  );
  for (const f of files) {
    const full = "/proj/" + f.path;
    const dir = full.slice(0, full.lastIndexOf("/"));
    if (dir !== "/proj") pyodide.FS.mkdirTree(dir);
    pyodide.FS.writeFile(full, f.content);
  }
}

async function run(msg) {
  busy = true;
  try {
    await init();
    const entry = msg.files.find((f) => f.path === msg.entry);
    const source = entry ? entry.content : "";
    writeProject(msg.files);
    try {
      await pyodide.loadPackagesFromImports(source);
    } catch (_) {
      /* paket tidak ketemu: biarkan Python yang melaporkan ImportError */
    }
    postMessage({ type: "status", value: "running" });
    pyodide.globals.set("_pg_src", source);
    pyodide.globals.set("_pg_entry", msg.entry);
    const ok = await pyodide.runPythonAsync("await pg_run(_pg_src, _pg_entry)");
    postMessage({ type: "done", ok: !!ok });
  } catch (err) {
    postMessage({ type: "out", stream: "stderr", data: String((err && err.message) || err) + "\n" });
    postMessage({ type: "done", ok: false });
  } finally {
    inputResolver = null;
    busy = false;
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "input") {
    if (inputResolver) {
      const resolve = inputResolver;
      inputResolver = null;
      resolve(String(msg.value));
    }
  } else if (msg.type === "run" && !busy) {
    void run(msg);
  }
};
