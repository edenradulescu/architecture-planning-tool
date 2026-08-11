import {
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColor,
  type NodeShape,
} from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// NODE_COLORS is ordered per ui-context.md's Node Color Palette table —
// named here so the templates below read by color intent instead of index.
const [DEFAULT, BLUE, PURPLE, ORANGE, RED, , GREEN, TEAL] = NODE_COLORS

function templateNode(
  id: string,
  shape: NodeShape,
  position: { x: number; y: number },
  label: string,
  color: NodeColor = DEFAULT_NODE_COLOR
): CanvasNode {
  const { width, height } = NODE_DEFAULT_SIZES[shape]
  return {
    id,
    type: "canvasNode",
    position,
    width,
    height,
    data: { label, color: color.fill, shape },
  }
}

function templateEdge(
  id: string,
  source: string,
  target: string,
  label = ""
): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    data: { label },
  }
}

const microservicesTemplate: CanvasTemplate = {
  id: "microservices",
  name: "Microservices Architecture",
  description:
    "A client talking to an API gateway that fans out to independent services, each backed by its own database.",
  nodes: [
    templateNode("client", "circle", { x: 0, y: 160 }, "Client", DEFAULT),
    templateNode("gateway", "hexagon", { x: 220, y: 160 }, "API Gateway", BLUE),
    templateNode("auth-service", "pill", { x: 460, y: 20 }, "Auth Service", PURPLE),
    templateNode("orders-service", "pill", { x: 460, y: 160 }, "Orders Service", PURPLE),
    templateNode("payments-service", "pill", { x: 460, y: 300 }, "Payments Service", PURPLE),
    templateNode("orders-db", "cylinder", { x: 700, y: 160 }, "Orders DB", TEAL),
    templateNode("payments-db", "cylinder", { x: 700, y: 300 }, "Payments DB", TEAL),
  ],
  edges: [
    templateEdge("client-gateway", "client", "gateway"),
    templateEdge("gateway-auth", "gateway", "auth-service"),
    templateEdge("gateway-orders", "gateway", "orders-service"),
    templateEdge("gateway-payments", "gateway", "payments-service"),
    templateEdge("orders-orders-db", "orders-service", "orders-db"),
    templateEdge("payments-payments-db", "payments-service", "payments-db"),
  ],
}

const cicdPipelineTemplate: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "A linear build pipeline from commit to production, with test gating and an artifact registry.",
  nodes: [
    templateNode("commit", "circle", { x: 0, y: 150 }, "Push to Repo", DEFAULT),
    templateNode("build", "rectangle", { x: 180, y: 135 }, "Build", BLUE),
    templateNode("test", "diamond", { x: 400, y: 100 }, "Tests Pass?", ORANGE),
    templateNode("deploy-staging", "pill", { x: 640, y: 20 }, "Deploy to Staging", PURPLE),
    templateNode("deploy-production", "pill", { x: 880, y: 20 }, "Deploy to Production", GREEN),
    templateNode("artifacts", "cylinder", { x: 640, y: 260 }, "Artifact Registry", TEAL),
  ],
  edges: [
    templateEdge("commit-build", "commit", "build"),
    templateEdge("build-test", "build", "test"),
    templateEdge("test-staging", "test", "deploy-staging", "Pass"),
    templateEdge("staging-production", "deploy-staging", "deploy-production"),
    templateEdge("build-artifacts", "build", "artifacts", "Store"),
  ],
}

const eventDrivenTemplate: CanvasTemplate = {
  id: "event-driven-system",
  name: "Event-Driven System",
  description:
    "A producer publishing to an event bus, fanning out to multiple consumers plus a dead letter queue.",
  nodes: [
    templateNode("producer", "pill", { x: 260, y: 0 }, "Order Service", BLUE),
    templateNode("event-bus", "hexagon", { x: 245, y: 160 }, "Event Bus", ORANGE),
    templateNode("notification-consumer", "pill", { x: 0, y: 340 }, "Notification Service", GREEN),
    templateNode("analytics-consumer", "pill", { x: 260, y: 340 }, "Analytics Service", PURPLE),
    templateNode("audit-consumer", "cylinder", { x: 520, y: 320 }, "Audit Log", TEAL),
    templateNode("dlq", "cylinder", { x: 520, y: 150 }, "Dead Letter Queue", RED),
  ],
  edges: [
    templateEdge("producer-bus", "producer", "event-bus"),
    templateEdge("bus-notification", "event-bus", "notification-consumer"),
    templateEdge("bus-analytics", "event-bus", "analytics-consumer"),
    templateEdge("bus-audit", "event-bus", "audit-consumer"),
    templateEdge("bus-dlq", "event-bus", "dlq", "Failed"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservicesTemplate,
  cicdPipelineTemplate,
  eventDrivenTemplate,
]
