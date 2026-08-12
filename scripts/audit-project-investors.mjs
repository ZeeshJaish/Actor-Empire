import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assertIncludes = (file, text, label = text) => {
    const source = read(file);
    if (!source.includes(text)) {
        throw new Error(`${file} is missing ${label}`);
    }
};
const greenlightInvestorSources = [
    'views/lifestyle/business/GreenlightWizard.tsx',
    'views/lifestyle/business/components/GreenlightConfirmationStep.tsx',
    'views/lifestyle/business/components/GreenlightInvestorFinancingSection.tsx',
].map(read).join('\n');
const assertGreenlightIncludes = (text, label = text) => {
    if (!greenlightInvestorSources.includes(text)) {
        throw new Error(`Greenlight investor modules are missing ${label}`);
    }
};

assertIncludes('types.ts', 'export interface ProjectInvestor');
assertIncludes('types.ts', "export type ProjectInvestorFundingMode = 'LEAD' | 'SYNDICATE';");
assertIncludes('types.ts', 'export interface ProjectInvestorRelationship');
assertIncludes('types.ts', 'investorRelationships?: ProjectInvestorRelationship[];');
assertIncludes('types.ts', 'investorPlan?: ProjectInvestorPlan;');
assertIncludes('types.ts', 'investorPayouts?: ProjectInvestorPayoutSummary;');
assertIncludes('types.ts', 'sourceProjectId?: string;');
assertIncludes('types.ts', 'sourceTitle?: string;');
assertIncludes('types.ts', "targetRole?: 'LEAD' | 'SYNDICATE' | 'EXCESS';");
assertIncludes('types.ts', 'cleanEquityPercent?: number;');
assertIncludes('types.ts', 'investorTags: string[];');
assertIncludes('types.ts', "'INVESTOR_FUNDING' | 'INVESTOR_PAYOUT'");
assertIncludes('types.ts', "'INVESTOR'");
assertIncludes('types.ts', 'export interface ProjectInvestorLeadershipChange');
assertIncludes('types.ts', 'investorLeadershipChanges?: ProjectInvestorLeadershipChange[];');
assertIncludes('types.ts', 'ownerNpcId?: string;');

assertIncludes('services/projectInvestors.ts', 'PROJECT_INVESTORS');
assertIncludes('services/projectInvestors.ts', 'INVESTOR_LEADERSHIP_POOL');
assertIncludes('services/projectInvestors.ts', 'getStudioInvestorScore');
assertIncludes('services/projectInvestors.ts', 'getMaxInvestorRaise');
assertIncludes('services/projectInvestors.ts', 'generateProjectInvestorOffers');
assertIncludes('services/projectInvestors.ts', 'buildProjectInvestorPlan');
assertIncludes('services/projectInvestors.ts', 'calculateInvestorPayout');
assertIncludes('services/projectInvestors.ts', 'processInvestorLeadershipChanges');
assertIncludes('services/projectInvestors.ts', 'investorOwnerNpcIdFromName');
assertIncludes('services/projectInvestors.ts', 'getInvestorTermMultiplier');
assertIncludes('services/projectInvestors.ts', 'getInvestorModeFit');
assertIncludes('services/projectInvestors.ts', 'availabilitySeed');
assertIncludes('services/projectInvestors.ts', 'getInvestorRelationship');
assertIncludes('services/projectInvestors.ts', 'applyInvestorPayoutMemory');
assertIncludes('services/projectInvestors.ts', 'updateInvestorRelationshipsForPlan');
assertIncludes('services/projectInvestors.ts', "fundingMode === 'LEAD'");
assertIncludes('services/projectInvestors.ts', 'remainingTarget');
assertIncludes('services/projectInvestors.ts', 'sourceProjectId,');
assertIncludes('services/projectInvestors.ts', 'sourceTitle,');
assertIncludes('services/projectInvestors.ts', 'Lead Investor');
assertIncludes('services/projectInvestors.ts', 'Risk Money');

assertGreenlightIncludes('Investor Financing');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'investorRaisePercent');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'setInvestorRaisePercent');
assertGreenlightIncludes('greenlight.investors.mode.lead.label', 'localized lead investor mode');
assertGreenlightIncludes('greenlight.investors.mode.syndicate.label', 'localized syndicate investor mode');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'previewPlan');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'Would Commit');
assertGreenlightIncludes('relationshipLabel');
assertGreenlightIncludes('investorTags');
assertGreenlightIncludes('investorFundingOverage');
assertGreenlightIncludes('unusedCapacity', 'unused offer capacity');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'Committed');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'setInvestorRaiseAmount');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'selectedInvestorPlan');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'sourceProjectId: selectedScript?.id');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'sourceTitle: selectedScript?.title');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'nextSeasonFundingSourceProjectId');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'netGreenlightCashRequirement');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'budget: studioCashRequirement');
assertIncludes('views/lifestyle/business/GreenlightWizard.tsx', 'INVESTOR_FUNDING');

assertIncludes('services/npcLogic.ts', 'createInvestorOwnerNPCs');
assertIncludes('services/npcLogic.ts', "occupation: 'INVESTOR'");
assertIncludes('services/npcLogic.ts', 'createInvestorOwnerNPCs().forEach');
assertIncludes('services/gameLoop.ts', "from './projectInvestors'");
assertIncludes('services/gameLoop.ts', 'appendInvestorPayout');
assertIncludes('services/gameLoop.ts', 'applyInvestorPayoutMemory');
assertIncludes('services/gameLoop.ts', 'processInvestorLeadershipChanges');
assertIncludes('services/gameLoop.ts', 'appointed ${change.newOwnerName}');
assertIncludes('services/gameLoop.ts', 'investorTheatricalPayout');
assertIncludes('services/gameLoop.ts', 'investorStreamingPayout');
assertIncludes('services/gameLoop.ts', 'investorSoundtrackPayout');
assertIncludes('services/gameLoop.ts', 'INVESTOR_PAYOUT');
assertIncludes('views/lifestyle/business/ReleaseWizard.tsx', 'investorStreamingDealPayout');
assertIncludes('views/lifestyle/business/ReleaseWizard.tsx', 'streaming deal payout');
assertIncludes('views/mobile/ImdbApp.tsx', 'Investor Funding');
assertIncludes('views/mobile/BoxOfficeApp.tsx', 'Investor Split');
assertIncludes('views/lifestyle/business/components/ProjectDashboardModal.tsx', 'Investor Split');

console.log('Project investor audit passed.');
