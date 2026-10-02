// Edit this file to change agent names, descriptions, stats and links.
// teamsUrl: in Copilot Studio open the agent > Channels > Teams and Microsoft 365 Copilot
//           > Availability options > Copy link, and paste it here.
window.AGENT_CITY_CONFIG = {
  agents: {
    hospital: {
      label: "Healthcare",
      title: "Healthcare agent",
      place: "City Hospital",
      color: "#2D7F86",
      description: "Answers patient questions, books appointments and pulls records from Dynamics 365.",
      status: "Online",
      teamsUrl: "",
      copilotUrl: "",
      stats: [["Appointments today", "142"], ["Open cases", "31"], ["Average reply time", "4 s"]]
    },
    tower: {
      label: "Real estate",
      title: "Real estate agent",
      place: "Harbor Tower",
      color: "#2E4A73",
      description: "Handles property inquiries, schedules viewings and drafts leases from your listings data.",
      status: "Online",
      teamsUrl: "",
      copilotUrl: "",
      stats: [["Active listings", "86"], ["Viewings this week", "23"], ["Leads followed up", "57"]]
    },
    
    cloudascent: {
      label: "Burjuman Business Center",
      title: "Cloudascent agent",
      place: "Redington",
      color: "#C8102E",
      description: "Explains sales drops and customer churn using Microsoft Fabric data.",
      status: "Online",
      teamsUrl: "https://teams.microsoft.com/l/app/?titleId=T_7475f7d0-5925-9f21-9997-cac7a9f65460",
      copilotUrl: "https://m365.cloud.microsoft/chat/?titleId=T_7475f7d0-5925-9f21-9997-cac7a9f65460&source=copilot-studio",
      stats: [["Accounts monitored", "1,240"], ["Churn alerts this week", "18"], ["Sales drops explained", "42"]]
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
