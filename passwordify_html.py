#!/usr/bin/env python3
import argparse
import pyaes
import os
import sys
import random
import string

sample_usage = """example:
  python passwordify_html.py file.html --password "this is the password"
  python passwordify_html.py file.html --password "this is the password" --master-password "master-password"
"""

parser = argparse.ArgumentParser(description="Generate a chart showing character traits.",
                                 epilog=sample_usage,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)

parser.add_argument('input_file',  type=str, metavar="input",
                    help='the html file')
parser.add_argument("--password",        "-p", dest="password",
                    required=False, type=str, metavar="page password",
                    help="The names of the character traits")
parser.add_argument("--master-password", "-m", dest="master_password",
                    required=False, type=str, metavar="master password",
                    help="The values for the character traits")
parser.add_argument("--output",          "-o", dest="output_file",
                    required=False, type=str, metavar="output",
                    help="The file which should be created")

args = parser.parse_args()

script_dir = os.path.dirname(__file__)

# passwords length must be in [16, 24, 32]
# at least one must be supplied, the other is chosen random
if args.password:
    assert(len(args.password) in [16, 24, 32])
    if not args.master_password:
        args.master_password = "".join(random.choice(string.ascii_letters) for i in range(32))
elif args.master_password:
    assert(len(args.master_password) in [16, 24, 32])
    if not args.password:
        args.password = "".join(random.choice(string.ascii_letters) for i in range(32))
else:
    assert(not "At least one of password or master password must be supplied")


# if no out_file was passed, append .pw.html to in_file
in_file  = args.input_file
out_file = args.output_file
if not out_file:
    out_file = f"{in_file}.pw.html"

print(f"passwordifying {in_file} -> {out_file}")

# read the whole html file
with open(in_file, "r") as in_file_handle:
    text =  in_file_handle.read()

# if the html has no body tag, then just copy it over
if "<body" not in text:

    sys.exit(0)

initial_counter = random.choice(list(range(128)))

# generate a real key
real_key = "".join(random.choice(string.ascii_letters) for i in range(32)).encode("utf-8")

aes = pyaes.AESModeOfOperationCTR(args.password.encode("utf-8"),
                                  counter=pyaes.Counter(initial_value=initial_counter))
org_key_enc_real_key = aes.encrypt(real_key).hex()

aes = pyaes.AESModeOfOperationCTR(args.master_password.encode("utf-8"),
                                  counter=pyaes.Counter(initial_value=initial_counter))
master_key_enc_real_key = aes.encrypt(real_key).hex()


#extract header, body, and footer
text_list = text.split("<body")
# assert that the <body> tag only appears once
if len(text_list) != 2:
    print(f"len(text_list) is {len(text_list)}")
    assert(False)

header = text_list[0]
text_list = text_list[1].split("</body>")
# assert that the </body> tag only appears once
assert(len(text_list) == 2)
body, footer = text_list

# read in the decipher function text
with open(os.path.join(script_dir, "decipher.js"), "r") as decipher_file:
    decipher_function_text = decipher_file.read()

# read in the html input prompt
with open(os.path.join(script_dir, "input_form.html"), "r") as html_prompt_file:
    html_prompt_text = html_prompt_file.read()


# have a "correct_marker" so the decrypter can check if the password was correct
# by identifiying if the decryped text ends with the correct_marker
correct_key_marker = "<!--Correct Key-->"
body = body + correct_key_marker
aes = pyaes.AESModeOfOperationCTR(real_key,
                                  counter=pyaes.Counter(initial_value=initial_counter))

real_key_enc_body = aes.encrypt(body.encode("utf-8")).hex()
header = header.replace("</head>", f"""
<script type="text/javascript" src="https://cdn.rawgit.com/ricmoo/aes-js/e27b99df/index.js"></script>
<script>
  var master_key_enc_real_key = "{master_key_enc_real_key}";
  var org_key_enc_real_key    = "{org_key_enc_real_key}";
  var correct_key_marker      = "{correct_key_marker}"
  var initial_counter         =  {initial_counter};
  var enc_hex_body            = "{real_key_enc_body}";
</script>
<script>
{decipher_function_text}
</script>
</head>""")
text = " ".join([header, f"""
<body>
{html_prompt_text}
</body>""", footer])

# write html to new location
with open(out_file, "wb") as new_html:
        new_html.write(text.encode('utf-8'))

print(f"successfully passwordified {in_file}")
