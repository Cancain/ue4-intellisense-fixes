
import * as vscode from 'vscode';

import { UE4Version } from './ntypes';
import { fixNoCompiler } from './fixes/v426/nocompiler';
import { fixWrongProject } from './fixes/v426/wrongproject';
import { fixUE4Source} from './fixes/v426/ue4source';
import { getUE4WorkspaceFolder, getUE4ProjectsMainWorkspace } from './shared';
import { Model } from './model';
import * as consts from './consts';

import * as console from './console';


export async function activate(context: vscode.ExtensionContext) {

	console.log('Extension "UE4 Intellisense Fixes" is now active!');

	const ue4Version = await getUE4Version();
	
	if(ue4Version === UE4Version.none){
		console.log("Didn't detect UE4 project.\n");
		return;
	}

	if (ue4Version === UE4Version.v426){
		console.log("Detected UE4 4.26 project.\n");
		await fixUE4Project426();
	}
	else if(ue4Version === UE4Version.v425){
		console.log("Detected UE4 4.25 project.\n");
		console.log ("No Fixes available yet.\n"); // @todo
	}
	
	console.log("\nExtension is done.");
}

export function deactivate() {
	console.outputChannel.dispose();
}


async function getUE4Version() : Promise<UE4Version> {
	const ue4WorkspaceFolder = getUE4WorkspaceFolder();

	if (!ue4WorkspaceFolder){
		return UE4Version.none;
	}

	const scopeMainWorkspace = await getUE4ProjectsMainWorkspace();
	const extensionSettings = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_EXTENSION, scopeMainWorkspace);
	
	const ue4Versions = new Map<UE4Version.v425 | UE4Version.v426, string | undefined >  ([ 
		[UE4Version.v425, undefined],  // @todo
		[UE4Version.v426, extensionSettings.get<string>(consts.CONFIG_SETTING_426_PATH_SUBSTRING, consts.UE4_426_DIR_FOLDER_NAME)]
	]);
	
	const result = Array.from(ue4Versions.keys()).find( key  => {
		const pathSubstring = ue4Versions.get(key);
		if (!pathSubstring){
			return false;
		}
		return ue4WorkspaceFolder.uri.fsPath.includes(pathSubstring);
	});

	if (!result){
		return UE4Version.none;
	}

	return result;
}


async function fixUE4Project426() {
	const mainWorkspaceFolder = await getUE4ProjectsMainWorkspace();
	const extensionSettings = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_EXTENSION, mainWorkspaceFolder);

	const isNoCompilerFixEnabled = extensionSettings.get<boolean>(consts.CONFIG_SETTING_426_FIX_NO_COMPILER);
	const isWrongProjectFixEnabled = extensionSettings.get<boolean>(consts.CONFIG_SETTING_426_FIX_WRONG_PROJECT);
	const isUE4SourceFixEnabled = extensionSettings.get<boolean>(consts.CONFIG_SETTING_426_FIX_UE4_SOURCE);

	const model = new Model();
	let ue4CCppPropertiesCopy = undefined;

	if (isNoCompilerFixEnabled) {
		await fixNoCompiler();
	}


	if (isWrongProjectFixEnabled) {
		ue4CCppPropertiesCopy = ue4CCppPropertiesCopy ? ue4CCppPropertiesCopy : await model.getCCppPropertiesCopy(getUE4WorkspaceFolder());
		await fixWrongProject(ue4CCppPropertiesCopy);
	}

	if (isUE4SourceFixEnabled) {
		ue4CCppPropertiesCopy = ue4CCppPropertiesCopy ? ue4CCppPropertiesCopy : await model.getCCppPropertiesCopy(getUE4WorkspaceFolder());
		await fixUE4Source(ue4CCppPropertiesCopy);
	}

	await model.writeCCppProperties(getUE4WorkspaceFolder(), ue4CCppPropertiesCopy);

	return;
}