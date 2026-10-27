// Edit this file to change agent names, descriptions, stats and links.
// teamsUrl: in Copilot Studio open the agent > Channels > Teams and Microsoft 365 Copilot
//           > Availability options > Copy link, and paste it here.
window.AGENT_CITY_CONFIG = {
  agents: {
    hospital: {
      label: "Healthcare",
      title: "Healthcare Operations Assistant",
      place: "City Hospital",
      color: "#2D7F86",
      description: "Answers patient questions, books appointments and pulls records from Dynamics 365.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_c9ab8ef6-e9c6-1269-648e-3b4fcb12f378",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_c9ab8ef6-e9c6-1269-648e-3b4fcb12f378&source=copilot-studio",
      stats: [["Appointments today", "142"], ["Open cases", "31"], ["Average reply time", "4 s"]]
    },
    tower: {
      label: "Real estate",
      title: "Real Estate Executive Agent",
      place: "Harbor Tower",
      color: "#2E4A73",
      description: "Gives executives a view of projects and properties, answers inquiries and drafts follow-ups from Dynamics 365.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_4ca2e129-5bb5-9f5d-e58c-3ac9a0ba17b5",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_4ca2e129-5bb5-9f5d-e58c-3ac9a0ba17b5&source=copilot-studio",
      stats: [["Active listings", "86"], ["Viewings this week", "23"], ["Leads followed up", "57"]]
    },
    cloudascent: {
      label: "Cloudascent",
      title: "Cloudascent agent",
      place: "Redington Tower",
      color: "#C8102E",
      description: "Explains sales drops and customer churn from your sales and partner data.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_7475f7d0-5925-9f21-9997-cac7a9f65460",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_7475f7d0-5925-9f21-9997-cac7a9f65460&source=copilot-studio",
      stats: [["Accounts monitored", "1,240"], ["Churn alerts this week", "18"], ["Sales drops explained", "42"]]
    },
    finance_analyst: {
      label: "Finance Analyst",
      title: "Universal Finance Analyst",
      place: "Ledger Tower",
      color: "#7CFF6B",
      description: "Analyses finance files you upload, from any sector, and turns them into insights and a report.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_052a7950-9c97-503a-a826-6fb3d6523cfc",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_052a7950-9c97-503a-a826-6fb3d6523cfc&source=copilot-studio",
      stats: [["Files analysed", "64"], ["Sectors covered", "4"], ["Reports sent", "29"]]
    },
    financial_planning: {
      label: "Planning",
      title: "Financial Planning Agent",
      place: "Planning Spire",
      color: "#9D7BFF",
      description: "Builds budgets and forecasts, compares plan against actuals and emails a planning report.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_53c03271-757d-ff87-309a-78ebcd78661b",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_53c03271-757d-ff87-309a-78ebcd78661b&source=copilot-studio",
      stats: [["Forecasts built", "12"], ["Budget lines tracked", "340"], ["Variance alerts", "7"]]
    },
    ap_control: {
      label: "AP Control",
      title: "Accounts Payable Control Agent",
      place: "AP Vault",
      color: "#3DFFB8",
      description: "Monitors supplier invoices and payments, flags anomalies and reports on payables.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_aecafbf8-5da3-29f5-04ac-e38851800138",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_aecafbf8-5da3-29f5-04ac-e38851800138&source=copilot-studio",
      stats: [["Invoices checked", "1,180"], ["Anomalies flagged", "14"], ["Payments due this week", "62"]]
    },
    finance_insights: {
      label: "Finance Insights",
      title: "Finance Insights Agent",
      place: "Insights Lab",
      color: "#4DA6FF",
      description: "Answers questions on financial performance and generates reports from your finance data.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_8dcf2ea6-b56b-e937-436c-b9727f1e1dd1",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_8dcf2ea6-b56b-e937-436c-b9727f1e1dd1&source=copilot-studio",
      stats: [["Questions answered", "418"], ["Reports generated", "37"], ["KPIs tracked", "24"]]
    },
    collections: {
      label: "Collections",
      title: "Collections Agent",
      place: "Collections Hub",
      color: "#FF8A3D",
      description: "Tracks overdue receivables, prioritises follow-ups and drafts payment reminders.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_b5b01991-0292-5ad3-b12b-eced05354312",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_b5b01991-0292-5ad3-b12b-eced05354312&source=copilot-studio",
      stats: [["Overdue accounts", "73"], ["Reminders sent", "158"], ["Collected this month", "61%"]]
    },
    expense_compliance: {
      label: "Expense Compliance",
      title: "Expense Compliance Agent",
      place: "Compliance Court",
      color: "#FFD84D",
      description: "Checks expense claims against policy, flags exceptions and emails a compliance report.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_32a50aaa-6d84-e21c-8f16-15886caa7cc9",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_32a50aaa-6d84-e21c-8f16-15886caa7cc9&source=copilot-studio",
      stats: [["Claims reviewed", "512"], ["Policy breaches", "9"], ["Approval rate", "94%"]]
    },
    plot: {
      label: "Next agent",
      title: "Next agent",
      place: "Under construction",
      color: "#C98B2A",
      description: "This plot is reserved for the next agent on the roadmap.",
      status: "Planned",
      comingSoon: true,
      stats: []
    }
  },
  statsNote: "Sample figures. Connect your API to show live numbers."
};