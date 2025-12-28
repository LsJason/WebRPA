import { gettingStartedContent } from './content-getting-started'
import { basicModulesContent } from './content-basic'
import { dataProcessingContent } from './content-data'
import { advancedFeaturesContent } from './content-advanced'
import { selectorGuideContent } from './content-selector'
import { practicalCasesContent } from './content-cases'
import { workflowPatternsContent } from './content-patterns'
import { tipsTricksContent } from './content-tips'
import { browserGuideContent } from './content-browser'
import { excelGuideContent } from './content-excel'
import { variablesGuideContent } from './content-variables'
import { debugGuideContent } from './content-debug'
import { notificationsGuideContent } from './content-notifications'
import { databaseGuideContent } from './content-database'

export const documentContents: Record<string, string> = {
  'getting-started': gettingStartedContent,
  'browser-guide': browserGuideContent,
  'basic-modules': basicModulesContent,
  'variables-guide': variablesGuideContent,
  'data-processing': dataProcessingContent,
  'excel-guide': excelGuideContent,
  'database-guide': databaseGuideContent,
  'advanced-features': advancedFeaturesContent,
  'selector-guide': selectorGuideContent,
  'notifications-guide': notificationsGuideContent,
  'debug-guide': debugGuideContent,
  'practical-cases': practicalCasesContent,
  'workflow-patterns': workflowPatternsContent,
  'tips-tricks': tipsTricksContent,
}
