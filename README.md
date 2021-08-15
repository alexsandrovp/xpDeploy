# xpDeploy
VSCode extension to deploy files on your local hard drive

## Installation

I didn't publish this extension to the vscode store.
To use it, follow these steps:

1. navigate to your extensions folder at `%userprofile%/.vscode/extensions`
2. copy the `xpDeploy.zip` file there
3. right click it and select "`Extract here`"
4. delete the zip

Now there must be a folder `xpDeploy` under `%userprofile%/.vscode/extensions` with all the necessary files.
<br>
Restart vscode and enjoy.

---
**Note**

Windows Explorer 'Extract all' command will create an extra folder with the same name of the zip. Please remove that extra path of the string when unzipping

---

## Settings
```json
"xp": {
	"defaultDeployment": "latest",
	"createButton": {
		"label": "Deploy to localhost",
		"withChoice": true
	},
	"deployments": [
		{
			"name": "latest",
			"source": "workspaceSrc",
			"target": "D:/deployments/latest"
		},
		{
			"name": "v2",
			"source": "workspaceSrc",
			"target": "D:/deployments/v2"
		}
	],
	"sources": [
		{
			"name": "workspaceSrc",
			"include": [
				"src/**/*"
			],
			"exclude": [
				"src/**/*.less",
				"src/**/*.scss"
			],
			"mapping": {
				"regex": "^src",
				"replace": ""
			}
		},
		{
			"name": "allFiles",
			"include": "**/*"
		}
	]
}
```
