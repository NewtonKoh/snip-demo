#!/usr/bin/env pwsh
$scriptPath = Split-Path -Resolve $MyInvocation.MyCommand.Path
$cliPath = Join-Path $scriptPath "cli.js"
& node $cliPath @args
