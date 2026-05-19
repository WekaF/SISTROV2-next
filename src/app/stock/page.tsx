import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Box } from "lucide-react"

export default function StockPage() {
  return (
    <div className="flex flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="grid gap-1">
                <CardTitle>Stock Management</CardTitle>
                <CardDescription>
                  Inventory and stock level monitoring across all plants.
                </CardDescription>
              </div>
              <Box className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Inventory tracking content will be implemented here.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
