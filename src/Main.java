import java.time.LocalDate;

public class Main {
    public static void main (String [] args){
        System.out.println("Proyecto Iniciado");
    
        RentalPeriod period = new RentalPeriod(
            LocalDate.of(2026, 12, 3),
            LocalDate.of(2026, 12, 6)
        );

        System.out.println("Período creado");


        Vehicule car= new Vehicule("V01");
        System.out.println(car.getId());

        Customer ana= new Customer("Ana","C01");
        System.out.println(ana.getName());

        Rental rental = new Rental(ana ,car,period);
        
        Customer ClienteDelAlquiler = rental.getCustomer();
        Vehicule autoDelAlquiler = rental.getVehicule();
        System.out.println(autoDelAlquiler.getId());


        System.out.println(rental.getStatus()); // Lee e imprime RESERVED
        rental.deliver();                       // Le pide al alquiler registrar la entrega
        System.out.println(rental.getStatus());


        System.out.println(rental.getRentalPeriod().getStartDate());

        DailyPlan dailyplan = new DailyPlan(100);
        System.out.println(dailyplan.calculateAmount(period.getDays()));
    }
}


