set shell := ["powershell.exe", "-c"]
set dotenv-load := true

serve:
    trunk serve -d dist -- .\src\index.html

build:
    trunk build -d dist -- .\src\index.html

test:
    ssh $env:REMOTE_SSH "touch $env:REMOTE_PATH/foo.txt"

deploy: build
    Compress-Archive .\dist\* .\dist.zip -Force
    ssh $env:REMOTE_SSH "rm -rf $env:REMOTE_PATH/*"
    scp .\dist.zip $env:REMOTE_SCP
    ssh $env:REMOTE_SSH "unzip $env:REMOTE_PATH/dist.zip -d $env:REMOTE_PATH"
